// Adapted from pnpwin/dsh-dsh-skillgrowth (MIT); see LICENSES/dsh-dsh-skillgrowth-MIT.txt.
import {createRequire} from 'node:module';
import {realpathSync} from 'node:fs';
import {isAbsolute,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const ALLOWED=new Set(['@deepseek-ai/schemastery','@deepseek-ai/dsh-llm','@deepseek-ai/dsh-tool-executor-native']);
export function resolveHostModule(name,options={}){
  if(!ALLOWED.has(name))throw Error('unexpected-host-dependency');
  const resources=options.resourcesPath??process.resourcesPath,entry=options.entrypoint??process.argv[1],resolveModule=options.resolve??((name,anchor)=>createRequire(anchor).resolve(name)),anchors=[];
  if(typeof resources==='string'&&isAbsolute(resources))anchors.push(join(resources,'app.asar','dsh','package.json'));
  if(typeof entry==='string'&&isAbsolute(entry)){try{anchors.push(realpathSync.native(entry));}catch{}anchors.push(entry);}
  for(const anchor of new Set(anchors)){try{const resolved=resolveModule(name,anchor);if(typeof resolved==='string'&&isAbsolute(resolved))return resolved;}catch{}}
  throw Error('running-dsh-host-unavailable');
}
export const hostImport=name=>import(pathToFileURL(resolveHostModule(name)).href);
