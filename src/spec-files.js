import {realpathSync,readFileSync,mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {isUtf8} from 'node:buffer';
import {resolve,relative,isAbsolute,dirname,join} from 'node:path';
import {validateSpec,digest,relativePath} from './eval-core.js';
const sensitive=p=>p.split(/[\\/]/).some(s=>/^(?:\.env(?:\..*)?|credentials?(?:\.[^.]*)?|auth\.json|id_rsa|.*\.(?:pem|key))$/i.test(s));
export function inside(root,path){const rel=relative(root,path);return rel===''||(!rel.startsWith('..'+String.fromCharCode(47))&&rel!=='..'&&!isAbsolute(rel));}
export function readWorkspaceFile(root,path,maxBytes=1000000){
  root=realpathSync(root);if(sensitive(path))throw Error('sensitive-path-denied');const absolute=realpathSync(resolve(root,path));
  if(!inside(root,absolute))throw Error('workspace-path-denied');const bytes=readFileSync(absolute);if(bytes.length>maxBytes||!isUtf8(bytes)||bytes.includes(0))throw Error('file-size-or-encoding');return {path:absolute,text:bytes.toString('utf8')};
}
function freeze(x){if(x&&typeof x==='object'){Object.freeze(x);for(const value of Object.values(x))freeze(value);}return x;}
function snapshotSkill(spec,base,workspace){
  if(spec===null)return null;
  const content=readWorkspaceFile(workspace,resolve(base,spec.contentPath),50000).text,resources={};let bytes=Buffer.byteLength(content);
  const skillBase=dirname(resolve(base,spec.contentPath));
  for(const path of spec.resources){const read=readWorkspaceFile(workspace,resolve(base,path),200000),alias=relative(skillBase,read.path);if(!relativePath(alias))throw Error('resource-outside-skill-directory');bytes+=Buffer.byteLength(read.text);if(bytes>1000000)throw Error('skill-size-limit');resources[alias]=read.text;}
  if(/-----BEGIN .*PRIVATE KEY-----|\bsk-(?:proj-)?[A-Za-z0-9_-]{24,}/.test(content+Object.values(resources).join('\n')))throw Error('sensitive-content-denied');
  return {...spec,content,resources,hash:digest({name:spec.name,description:spec.description,content,resources})};
}
export function prepareSpec(specPath,workspace){
  const root=realpathSync(workspace),source=readWorkspaceFile(root,specPath),validated=validateSpec(JSON.parse(source.text)),base=dirname(source.path);
  const skill=snapshotSkill(validated.skill,base,root),baselineSkill=snapshotSkill(validated.baselineSkill,base,root);
  const spec={...validated,skill,baselineSkill};return freeze({...spec,manifestHash:digest(validated),caseSetHash:digest(spec.cases),sourcePath:source.path,workspace:root});
}
function ensureDirectory(root,path){if(!inside(root,path))throw Error('output-path-denied');let current=root;for(const part of relative(root,path).split('/').filter(Boolean)){current=join(current,part);if(existsSync(current)){if(!inside(root,realpathSync(current)))throw Error('output-path-denied');}else mkdirSync(current);}}
export function createOutputRoot(workspace,runId){
  if(!/^skill-eval-[a-z0-9-]+$/.test(runId))throw Error('invalid-run-id');const root=realpathSync(workspace),parent=join(root,'.dsh-skill-creator','runs');ensureDirectory(root,parent);if(!inside(root,realpathSync(parent)))throw Error('output-path-denied');const dir=join(parent,runId);mkdirSync(dir);return dir;
}
export function saveArtifact(root,name,value){
  if(!relativePath(name))throw Error('artifact-path-denied');const target=resolve(root,name);if(!inside(root,target))throw Error('artifact-path-denied');ensureDirectory(root,dirname(target));if(!inside(root,realpathSync(dirname(target))))throw Error('artifact-path-denied');writeFileSync(target,typeof value==='string'?value:JSON.stringify(value,null,2)+'\n',{flag:'wx'});return target;
}
