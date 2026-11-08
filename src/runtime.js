import {randomUUID} from 'node:crypto';
import {readFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join,resolve} from 'node:path';
import {createBudget,runPaired} from './eval-core.js';
import {prepareSpec,createOutputRoot,saveArtifact} from './spec-files.js';
import {createNativeRunner} from './native-runner.js';
import {renderReport} from './report.js';
const skillDir=fileURLToPath(new URL('./skills/dsh-skill-creator/',import.meta.url));
const json=value=>[{type:'text',text:JSON.stringify(value)}];
export function installRuntime(ctx,config,{NativeToolExecutor,createUserMessage}){
  const handles=new Map(),runs=new Map();
  ctx.skills.register({name:'dsh-skill-creator',description:'Create, test and improve DSH skills using paired native baseline/with-skill runs, objective checks, actual usage/time and bounded RED/GREEN/REFACTOR. Also use for trigger descriptions and skill quality review.',content:readFileSync(join(skillDir,'SKILL.md'),'utf8'),source:'runtime',provider:'dsh-skill-creator',resourceBase:{kind:'directory',path:skillDir},invocation:{modelInvocable:true,userInvocable:true}});
  ctx.effect(()=>async()=>{for(const h of handles.values())h.controller.abort('plugin-disposed');await Promise.allSettled([...handles.values()].map(h=>h.done));});
  ctx.tools.register({name:'skill_eval',description:'Validate a skill-evaluation spec without model calls, run an explicit paid native baseline/with-skill comparison, or read its report. Uses isolated text-file capabilities; never executes generated code or publishes skills.',parameters:{type:'object',properties:{action:{type:'string',enum:['validate','run','report']},specPath:{type:'string',description:'Workspace-contained JSON spec for validate/run; relative to the current working directory.'},runId:{type:'string',description:'Run returned by this tool for report.'},split:{type:'string',enum:['train','holdout','all'],description:'Cases selected for this run; default train. Holdout is for final evaluation, not iterative tuning.'},maxCalls:{type:'integer',minimum:1,maximum:200,description:'Shared logical dispatch cap across every arm, attempt and auxiliary request; default18, also bounded by plugin Config.'},timeoutMs:{type:'integer',minimum:5000,maximum:300000,description:'Total run deadline; default300000, also bounded by plugin Config.'}},required:['action'],additionalProperties:false},output:{schema:{type:'object',additionalProperties:true},render:(_args,value)=>json(value)},async execute(args,exec){
    const owner=exec.agent,workspace=ctx.workingDirectory.get(owner.session);
    if(args.action==='report'){const item=runs.get(args.runId);if(!item||item.owner!==owner.id)throw Error('run-unavailable');return item.report?{runId:args.runId,status:item.status,reportPath:item.reportPath,reportJson:item.reportJson,summary:item.report.summary}:{runId:args.runId,status:item.status,jobId:item.jobId};}
    if(!['validate','run'].includes(args.action)||typeof args.specPath!=='string')throw Error('spec-required');
    const spec=prepareSpec(args.specPath,workspace),split=args.split??'train';
    if(!['train','holdout','all'].includes(split))throw Error('invalid-split');
    const selectedSpec={...spec,cases:spec.cases.filter(c=>split==='all'||c.split===split)};
    if(!selectedSpec.cases.length)throw Error('no-cases-for-split');
    if(args.action==='validate')return {valid:true,skill:spec.skill.name,candidateHash:spec.skill.hash,baseline:spec.baselineSkill?.name??'no-skill',caseSetHash:spec.caseSetHash,cases:spec.cases.length,repetitions:spec.repetitions,runs:spec.cases.length*spec.repetitions*2,capability:'memory text files; no generated-code execution',paidCalls:0};
    if([...handles.values()].some(h=>h.owner===owner.id))throw Error('owner-run-already-active');
    const maxCalls=args.maxCalls??config.maxLogicalCalls,timeoutMs=args.timeoutMs??config.timeoutMs;
    if(!Number.isSafeInteger(maxCalls)||maxCalls<1||maxCalls>config.maxLogicalCalls||!Number.isSafeInteger(timeoutMs)||timeoutMs<5000||timeoutMs>config.timeoutMs)throw Error('run-limit-exceeds-config');
    const currentModel=owner.model?.current?.();if(!currentModel?.provider||!currentModel?.model)throw Error('model-unavailable');const selection={provider:currentModel.provider,model:currentModel.model,...(currentModel.reasoningEffort?{reasoningEffort:currentModel.reasoningEffort}:{})};
    const runId='skill-eval-'+randomUUID(),dir=createOutputRoot(workspace,runId),budget=createBudget(maxCalls),controller=new AbortController();
    const timer=setTimeout(()=>controller.abort('run-timeout'),timeoutMs);timer.unref?.();
    const item={owner:owner.id,status:'running',dir};runs.set(runId,item);
    let resolveDone;const done=new Promise(r=>resolveDone=r);handles.set(runId,{owner:owner.id,controller,done});
    let jobId;try{jobId=ctx.jobs.start({kind:'skill-eval',label:'Paired skill evaluation: '+spec.skill.name,owner:owner.id,outputLimitBytes:131072,run(job){
      const promise=(async()=>{
        try{
          saveArtifact(dir,'run-plan.json',{schemaVersion:1,runId,owner:owner.id,model:selection,spec,maxCalls,timeoutMs,maxSteps:config.maxSteps});
          const cwdFor=(caseId,arm,rep)=>{const p=resolve(dir,`cases/${caseId}/${rep}/${arm}/workspace`);mkdirSync(p,{recursive:true});return p;};
          const runner=createNativeRunner(ctx,{NativeToolExecutor,createUserMessage,ownerAgent:owner,modelConfig:selection,maxSteps:config.maxSteps,maxTokens:config.maxOutputTokens,cwdFor,signal:controller.signal});
          job.append('Starting bounded paired native tasks; no production skill publication.\n');
          const result=await runPaired(selectedSpec,{runCase:runner,budget,signal:controller.signal,seed:spec.seed});
          for(const row of result.rows){const prefix=`cases/${row.caseId}/${row.repetition}/${row.arm}`;saveArtifact(dir,prefix+'/result.json',row);for(const [path,content]of Object.entries(row.files??{}))saveArtifact(dir,prefix+'/outputs/'+path,content);}
          if(spec.mode==='routing')result.summary.verdict='routing-'+result.summary.verdict;
          const report={schemaVersion:1,mode:spec.mode,split,runId,at:new Date().toISOString(),model:selection,manifestHash:spec.manifestHash,skillHash:spec.skill.hash,baselineSkillHash:spec.baselineSkill?.hash??null,caseSetHash:spec.caseSetHash,...result};
          item.reportJson=saveArtifact(dir,'benchmark.json',report);item.reportPath=saveArtifact(dir,'benchmark.md',renderReport(report));item.report=report;item.status=controller.signal.aborted?'cancelled':'completed';
          job.append(`Completed ${report.rows.length} arm attempts; ${report.budget.used} logical calls; ${report.summary.verdict}.\n`);
          return {status:controller.signal.aborted?'killed':'completed',detail:report.summary.verdict,result:JSON.stringify({runId,reportPath:item.reportPath,reportJson:item.reportJson,budget:report.budget,summary:report.summary})};
        }catch(error){item.status='failed';item.error=/^[a-z0-9-]{1,80}$/.test(error.message)?error.message:'evaluation-failed';saveArtifact(dir,'failure.json',{runId,error:item.error,budget:budget.snapshot()});return {status:controller.signal.aborted?'killed':'failed',detail:item.error,result:JSON.stringify({runId,error:item.error,artifacts:dir,budget:budget.snapshot()})};}
        finally{clearTimeout(timer);handles.delete(runId);resolveDone();}
      })();return {cancel:reason=>controller.abort(reason??'user-cancelled'),done:promise};
    }});}catch(error){clearTimeout(timer);handles.delete(runId);item.status='failed';resolveDone();throw error;}
    item.jobId=jobId;return {runId,jobId,status:'running',artifacts:dir,maxCalls,timeoutMs,publication:false};
  }});
}
