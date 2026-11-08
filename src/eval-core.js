import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const exact=(x,keys)=>obj(x)&&Object.keys(x).every(k=>keys.includes(k));
const text=(x,max=20000)=>typeof x==='string'&&x.length>0&&x.length<=max&&!x.includes('\0');
const fail=code=>{throw new TypeError(code);};
export const digest=x=>createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
export function relativePath(p){return text(p,240)&&!p.startsWith('/')&&!p.includes('\\')&&!/^[A-Za-z]:/.test(p)&&p.split('/').every(s=>s&&s!=='.'&&s!=='..')&&!['__proto__','prototype','constructor'].some(k=>p.split('/').includes(k));}
const id=x=>typeof x==='string'&&/^[a-z][a-z0-9-]{0,60}$/.test(x);
function skillSpec(x){
  if(!exact(x,['name','description','contentPath','resources'])||!id(x.name)||!text(x.description,1000)||!relativePath(x.contentPath))fail('invalid-skill');
  const resources=x.resources??[];
  if(!Array.isArray(resources)||resources.length>32||resources.some(p=>!relativePath(p))||new Set(resources).size!==resources.length)fail('invalid-skill-resources');
  return {...x,resources};
}
export function validateSpec(value){
  if(!exact(value,['schemaVersion','mode','skill','baselineSkill','cases','repetitions','seed'])||value.schemaVersion!==1)fail('invalid-spec');
  const mode=value.mode??'task';if(!['task','routing'].includes(mode))fail('invalid-mode');
  const skill=skillSpec(value.skill),baselineSkill=value.baselineSkill==null?null:skillSpec(value.baselineSkill);
  const repetitions=value.repetitions??1,seed=value.seed??42;
  if(!Number.isSafeInteger(repetitions)||repetitions<1||repetitions>5||!Number.isSafeInteger(seed)||seed<0||seed>0xffffffff)fail('invalid-repetitions-or-seed');
  if(!Array.isArray(value.cases)||!value.cases.length||value.cases.length>16||value.cases.length*repetitions*2>64)fail('invalid-case-count');
  const ids=new Set();let total=0;
  const cases=value.cases.map(c=>{
    if(!exact(c,['id','split','prompt','files','writable','checks'])||!id(c.id)||ids.has(c.id)||!['train','holdout'].includes(c.split)||!text(c.prompt))fail('invalid-case');ids.add(c.id);
    if(!obj(c.files)||Object.keys(c.files).length>32||Object.entries(c.files).some(([p,v])=>!relativePath(p)||!text(v,100000)))fail('invalid-input-files');
    if(!Array.isArray(c.writable)||(mode==='task'&&!c.writable.length)||c.writable.length>16||new Set(c.writable).size!==c.writable.length||c.writable.some(p=>!relativePath(p)||p.startsWith('.skill/')))fail('invalid-writable');
    if(!Array.isArray(c.checks)||!c.checks.length||c.checks.length>32)fail('invalid-checks');
    for(const check of c.checks){
      if(mode==='routing'){if(!exact(check,['type','expected'])||check.type!=='skill-loaded'||typeof check.expected!=='boolean')fail('invalid-routing-check');continue;}
      if(!exact(check,['type','path','expected','text'])||!relativePath(check.path)||!c.writable.includes(check.path)||!['json-equals','text-includes','text-excludes','file-exists'].includes(check.type))fail('invalid-check');
      if(check.type==='json-equals'){if(!Object.hasOwn(check,'expected')||Object.hasOwn(check,'text'))fail('invalid-check');try{const raw=JSON.stringify(check.expected);if(raw===undefined||raw.length>100000||/"(?:__proto__|constructor|prototype)"\s*:/.test(raw))fail('invalid-check');}catch{fail('invalid-check');}}
      else if(check.type==='file-exists'){if(Object.hasOwn(check,'expected')||Object.hasOwn(check,'text'))fail('invalid-check');}
      else if(!text(check.text,100000)||Object.hasOwn(check,'expected'))fail('invalid-check');
    }
    total+=JSON.stringify(c).length;if(total>1000000)fail('spec-size-limit');
    return structuredClone(c);
  });
  return {schemaVersion:1,mode,skill,baselineSkill,cases,repetitions,seed};
}
export function createBudget(limit){
  if(!Number.isSafeInteger(limit)||limit<1||limit>200)fail('invalid-call-cap');let used=0,denied=0;
  return Object.freeze({reserve(){if(used>=limit){denied++;throw Error('hard-call-cap');}used++;return used;},snapshot(){return {limit,used,denied};}});
}
export function gradeFiles(files,checks,context={}){
  if(!obj(files)||!Array.isArray(checks)||!checks.length)fail('invalid-grade-input');
  const results=checks.map(c=>{
    if(obj(c)&&c.type==='skill-loaded'){if(typeof c.expected!=='boolean'||typeof context.candidateLoaded!=='boolean')fail('invalid-routing-grade');return {type:c.type,passed:context.candidateLoaded===c.expected};}
    if(!obj(c)||!relativePath(c.path)||!['json-equals','text-includes','text-excludes','file-exists'].includes(c.type))fail('invalid-grade-input');
    let passed=false;const value=Object.hasOwn(files,c.path)?files[c.path]:undefined;
    if(c.type==='file-exists')passed=typeof value==='string';
    else if(c.type==='text-includes')passed=typeof value==='string'&&value.includes(c.text);
    else if(c.type==='text-excludes')passed=typeof value==='string'&&!value.includes(c.text);
    else if(c.type==='json-equals'){try{passed=typeof value==='string'&&isDeepStrictEqual(JSON.parse(value),c.expected);}catch{}}
    return {type:c.type,path:c.path,passed};
  });
  return {passed:results.every(c=>c.passed),checks:results};
}
export function usageOf(value){
  const fields=['inputTokens','outputTokens','totalTokens','cacheReadTokens','cacheWriteTokens'];
  return Object.fromEntries(fields.map(k=>[k,Number.isSafeInteger(value?.[k])&&value[k]>=0?value[k]:null]));
}
const sumKnown=(rows,key)=>rows.length&&rows.every(r=>Number.isFinite(r[key]))?rows.reduce((n,r)=>n+r[key],0):null;
function stats(values){
  const xs=values.filter(x=>typeof x==='number'&&Number.isFinite(x));
  if(xs.length!==values.length||!xs.length)return {n:xs.length,mean:null,stddev:null};
  const mean=xs.reduce((a,b)=>a+b,0)/xs.length;
  return {n:xs.length,mean,stddev:xs.length>1?Math.sqrt(xs.reduce((a,b)=>a+(b-mean)**2,0)/(xs.length-1)):null};
}
function summarizeArm(rows){return {attempts:rows.length,passed:rows.filter(r=>r.passed).length,complete:rows.filter(r=>r.status==='completed').length,elapsedMs:stats(rows.map(r=>r.elapsedMs)),modelCalls:sumKnown(rows,'modelCalls'),usage:Object.fromEntries(['inputTokens','outputTokens','totalTokens','cacheReadTokens','cacheWriteTokens'].map(k=>[k,sumKnown(rows.map(r=>usageOf(r.usage)),k)]))};}
export function aggregate(rows){
  if(!Array.isArray(rows))fail('invalid-report-rows');
  const arms=Object.fromEntries(['baseline','with_skill'].map(arm=>[arm,summarizeArm(rows.filter(r=>r.arm===arm))]));
  const groups=new Map();
  for(const r of rows){const key=JSON.stringify([r.caseId,r.repetition]);if(!groups.has(key))groups.set(key,{});if(groups.get(key)[r.arm])fail('duplicate-pair-arm');groups.get(key)[r.arm]=r;}
  const pairs=[...groups.values()].map(g=>{const a=g.baseline,b=g.with_skill,complete=!!a&&!!b&&a.status==='completed'&&b.status==='completed';return {caseId:a?.caseId??b.caseId,split:a?.split??b.split,repetition:a?.repetition??b.repetition,complete,baselinePassed:a?.passed??null,withSkillPassed:b?.passed??null,passDelta:complete?Number(b.passed)-Number(a.passed):null,elapsedDeltaMs:complete&&Number.isFinite(a.elapsedMs)&&Number.isFinite(b.elapsedMs)?b.elapsedMs-a.elapsedMs:null,inputTokenDelta:complete&&Number.isFinite(a.usage?.inputTokens)&&Number.isFinite(b.usage?.inputTokens)?b.usage.inputTokens-a.usage.inputTokens:null};});
  const complete=pairs.filter(p=>p.complete),wins=complete.filter(p=>p.passDelta>0).length,regressions=complete.filter(p=>p.passDelta<0).length;
  return {arms,pairs,samples:complete.length,observedWins:wins,observedRegressions:regressions,verdict:complete.length!==pairs.length||!complete.length?'inconclusive':regressions?'observed-regression':wins?'observed-case-gain':'no-observed-quality-gain',bySplit:Object.fromEntries(['train','holdout'].map(split=>[split,{pairs:pairs.filter(p=>p.split===split).length,complete:complete.filter(p=>p.split===split).length,wins:complete.filter(p=>p.split===split&&p.passDelta>0).length,regressions:complete.filter(p=>p.split===split&&p.passDelta<0).length}])),limitations:['Descriptive paired observations, not causal generalization.','Loaded skill is not proof of use or helpfulness.','Unknown counters are null; sample stddev needs at least two values.']};
}
function frozen(x){if(x&&typeof x==='object'){Object.freeze(x);for(const v of Object.values(x))frozen(v);}return x;}
export async function runPaired(spec,{runCase,budget,signal,seed=spec.seed??42}={}){
  if(typeof runCase!=='function'||!budget?.reserve)fail('missing-native-runner');
  let state=seed>>>0;const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
  const work=[];for(let repetition=0;repetition<(spec.repetitions??1);repetition++)for(const c of spec.cases)work.push({c,repetition});
  for(let i=work.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[work[i],work[j]]=[work[j],work[i]];}
  const rows=[];
  for(const {c,repetition} of work){
    const task=frozen(structuredClone({id:c.id,prompt:c.prompt,files:c.files,writable:c.writable}));
    const armOrder=random()<0.5?['baseline','with_skill']:['with_skill','baseline'];
    const pair=await Promise.all(armOrder.map(async arm=>{
      const common={caseId:c.id,split:c.split,repetition,arm};
      if(signal?.aborted||budget.snapshot().used>=budget.snapshot().limit)return {...common,status:'not-run',passed:false,error:signal?.aborted?'aborted':'hard-call-cap',elapsedMs:null,modelCalls:0,usage:usageOf(null)};
      let result;
      try{result=await runCase({task:frozen(structuredClone(task)),mode:spec.mode??'task',skill:arm==='baseline'?spec.baselineSkill:spec.skill,arm,repetition,budget,signal});
        const grade=gradeFiles(result.files??{},c.checks,result),completed=result.terminal==='completed'&&result.finished===true;
        return {...result,...common,status:completed?'completed':'failed',passed:completed&&grade.passed,checks:grade.checks,usage:usageOf(result.usage),elapsedMs:Number.isFinite(result.elapsedMs)&&result.elapsedMs>=0?result.elapsedMs:null,modelCalls:Number.isSafeInteger(result.modelCalls)&&result.modelCalls>=0?result.modelCalls:null,files:result.files};
      }catch(error){result=error?.result??{};return {...common,...result,status:'failed',passed:false,error:/^[a-z0-9-]{1,80}$/.test(error.message)?error.message:'case-failed',elapsedMs:Number.isFinite(result.elapsedMs)?result.elapsedMs:null,modelCalls:Number.isSafeInteger(result.modelCalls)?result.modelCalls:null,usage:usageOf(result.usage)};}
    }));rows.push(...pair);
  }
  return {rows,summary:aggregate(rows),budget:budget.snapshot()};
}
