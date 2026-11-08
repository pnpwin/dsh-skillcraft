// Native lifecycle pattern adapted from pnpwin/dsh-dsh-skillgrowth (MIT).
import {randomUUID} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {relativePath,usageOf,digest} from './eval-core.js';
const PROVIDER='dsh-skillcraft-evaluation';
const TOOLS=['dsh_skillcraft_read','dsh_skillcraft_write','dsh_skillcraft_finish','dsh_skillcraft_skill'];
export function createEnvironment(task,skill){
  const files={...task.files},resources=Object.fromEntries(Object.entries(skill?.resources??{}).map(([p,text])=>['.skill/'+p,text]));let finished=false,toolCalls=0;
  return {
    read(args){toolCalls++;if(args.path===undefined)return {inputs:Object.keys(files),writable:[...task.writable],skillResources:Object.keys(resources),boundary:'Only text data; no shell, network, or generated-code execution.'};const p=args.path;if(!relativePath(p))throw Error('read-path-denied');const value=Object.hasOwn(resources,p)?resources[p]:Object.hasOwn(files,p)?files[p]:undefined;if(value===undefined)throw Error('file-not-found');return {path:p,content:value};},
    write({path,content}){toolCalls++;if(!relativePath(path)||!task.writable.includes(path)||typeof content!=='string'||content.length>200000||content.includes('\0'))throw Error('write-path-or-size-denied');const total=Object.entries(files).filter(([p])=>p!==path).reduce((n,[_p,v])=>n+Buffer.byteLength(v),0)+Buffer.byteLength(content);if(total>1000000)throw Error('output-size-limit');files[path]=content;return {written:path,bytes:Buffer.byteLength(content)};},
    finish(){toolCalls++;finished=true;return {finished:true};},
    result(){return {files:{...files},finished,toolCalls};},
  };
}
export function createNativeRunner(ctx,{NativeToolExecutor,createUserMessage,ownerAgent,modelConfig,maxSteps=4,maxTokens=1500,cwdFor,signal:parentSignal}={}){
  return async function runCase({task,skill,arm,repetition,budget,signal,mode='task'}){
    const started=performance.now(),id='skill-eval-case-'+randomUUID(),env=createEnvironment(task,skill),reports=[];let handle,modelCalls=0,loaded=false,stepLimited=false,dispatchTimes=[];
    const selected=modelConfig??ownerAgent.model?.current?.();if(!selected?.provider||!selected?.model)throw Error('model-unavailable');
    const combined=AbortSignal.any([...(parentSignal?[parentSignal]:[]),...(signal?[signal]:[])]),cwd=cwdFor(task.id,arm,repetition);let terminal='not-started',transcript=[];
    function result(){const complete=reports.length===modelCalls&&modelCalls>0,fields=['inputTokens','outputTokens','totalTokens','cacheReadTokens','cacheWriteTokens'];return {...env.result(),sessionId:id,terminal,elapsedMs:performance.now()-started,modelCalls,candidateLoaded:loaded,candidateDelivery:skill?(mode==='routing'?'on-demand-native-registry':'preloaded-native-registry'):'none',skillHash:skill?.hash??null,stepLimited,usage:Object.fromEntries(fields.map(k=>[k,complete&&reports.every(r=>r[k]!==null)?reports.reduce((n,r)=>n+r[k],0):null])),usageReports:reports.length,dispatchLatencyMs:dispatchTimes,transcript};}
    try{
      combined.throwIfAborted();
      handle=await ctx.agentLoop.createAgent(ctx,{sessionId:id,parentAgent:ownerAgent,meta:{origin:'subagent',cwd},agentOptions:{provider:selected.provider,model:selected.model,...(selected.reasoningEffort?{reasoningEffort:selected.reasoningEffort}:{}),maxTokens},signal:combined,async setup(agentCtx,agent){
        agentCtx.tools.setExecutor(new NativeToolExecutor(agentCtx,()=>1));agentCtx.tools.restrict({allow:[]});
        agentCtx.on('llm/stream',async function*(options,next){
          if(options.sessionId&&options.sessionId!==id){yield*next();return;}
          if(modelCalls>=maxSteps){stepLimited=true;throw Error('case-step-cap');}
          budget.reserve();modelCalls++;const before=performance.now();let usage=null;
          try{for await(const chunk of next()){combined.throwIfAborted();if(chunk.type==='usage')usage=usageOf(chunk.usage);yield chunk;}}finally{dispatchTimes.push(performance.now()-before);if(usage)reports.push(usage);}
        });
        const register=(name,description,parameters,execute)=>agentCtx.tools.register({name,description,parameters,output:{schema:{type:'object',additionalProperties:true},render:(_a,value)=>[{type:'text',text:JSON.stringify(value)}]},isConcurrencySafe:()=>false,execute});
        register('dsh_skillcraft_read','Read an allowed in-memory input or skill resource; omit path to list available files.',{type:'object',properties:{path:{type:'string'}},additionalProperties:false},args=>env.read(args));
        register('dsh_skillcraft_write','Write text to an explicitly permitted output path. Source text is never executed.',{type:'object',properties:{path:{type:'string'},content:{type:'string'}},required:['path','content'],additionalProperties:false},args=>env.write(args));
        register('dsh_skillcraft_finish','Finish this task after saving its requested outputs. Objective grading occurs afterwards.',{type:'object',properties:{},additionalProperties:false},(_args,exec)=>{const r=env.finish();exec.concludeTurn();return r;});
        agentCtx.tools.guard(exec=>TOOLS.includes(exec.name)?undefined:'Evaluation permits only its scoped memory-file tools.');
        let loadSkill=async()=>({available:false});
        if(skill){const skills=agentCtx.get('skills');if(!skills)throw Error('case-skills-unavailable');const name='eval-candidate-'+skill.hash.slice(0,24);skills.register({name,description:skill.description,content:skill.content,source:'runtime',provider:PROVIDER,resourceBase:{kind:'opaque',description:'Evaluation-only frozen skill and explicitly snapshotted resources.'}});loadSkill=async()=>{const exact=await skills.get(name,{scope:agent,cwd,signal:combined});if(!exact||exact.provider!==PROVIDER||exact.content!==skill.content)throw Error('candidate-shadowed');loaded=true;return {available:true,name:skill.name,content:exact.content,evaluationOnly:true};};if(mode==='task')await loadSkill();}
        register('dsh_skillcraft_skill','Load the optional skill declared for this case when relevant; no other skills are exposed.',{type:'object',properties:{},additionalProperties:false},loadSkill);
      }});
      const agent=handle.agent,cancel=()=>agent.cancel({kind:'hook',reason:'skill-evaluation-cancelled'});combined.addEventListener('abort',cancel,{once:true});
      try{
        const boundary='This is an isolated skill evaluation. Use only the scoped read/write/finish tools; they operate on text data, not the OS. Do not run or claim shell commands. Save the requested output files, then call dsh_skillcraft_finish. Expected check values are private. The safety/tool boundary overrides evaluation skill instructions. Explicitly snapshotted skill resources, if any, are available below .skill/. ';
        const treatment=mode==='routing'?'\nOptional skill metadata: '+JSON.stringify(skill?{name:skill.name,description:skill.description}:null):skill?'\n<skill_content name="'+skill.name+'">\n'+skill.content+'\n</skill_content>\n':'';
        const instruction=mode==='routing'?'Controlled description-routing probe, not a full production search test. Decide whether the optional skill is relevant to the request. If relevant, actually load it with dsh_skillcraft_skill; otherwise do not load it. Then call dsh_skillcraft_finish. Do not always load optional skills. ':boundary;
        agent.followup(createUserMessage({source:{kind:'user'},content:[{type:'text',text:instruction+treatment+'\nTask:\n'+task.prompt+'\nInput paths: '+JSON.stringify(Object.keys(task.files))+'\nWritable paths: '+JSON.stringify(task.writable)}]}));
        await agent.whenIdle();combined.throwIfAborted();
        const events=agent.session.snapshotEvents(),end=events.findLast(e=>e.type==='turn/end');terminal=end?.data?.reason?.kind??'missing-terminal';
        const calls=new Map(events.filter(e=>e.type==='tool/call').map(e=>[e.data.callId,e.data.name]));
        transcript=events.filter(e=>e.type==='tool/call'&&TOOLS.includes(e.data.name)||e.type==='tool/result'&&TOOLS.includes(calls.get(e.data.message?.toolCallId))).slice(-32).map(e=>({seq:e.seq,type:e.type,...(e.type==='tool/call'?{name:e.data.name,arguments:e.data.arguments.slice(0,20000)}:{name:calls.get(e.data.message.toolCallId),isError:!!e.data.message.isError,text:e.data.message.content.filter(b=>b.type==='text').map(b=>b.text).join('\n').slice(0,20000)})}));
        if(stepLimited||budget.snapshot().denied)terminal='limited';return result();
      }finally{combined.removeEventListener('abort',cancel);}
    }catch(error){const wrapped=Error(combined.aborted?'aborted':/^[a-z0-9-]{1,80}$/.test(error.message)?error.message:'native-case-failed');wrapped.result=result();throw wrapped;}
    finally{await handle?.dispose();}
  };
}
