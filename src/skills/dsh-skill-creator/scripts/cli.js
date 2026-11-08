#!/usr/bin/env node
import {prepareSpec,readWorkspaceFile} from '../../../spec-files.js';
import {renderReport} from '../../../report.js';
const [action,path]=process.argv.slice(2);
try{
  if(action==='validate'&&path){const spec=prepareSpec(path,process.cwd());console.log(JSON.stringify({valid:true,mode:spec.mode,skill:spec.skill.name,skillHash:spec.skill.hash,caseSetHash:spec.caseSetHash,cases:spec.cases.length,runs:spec.cases.length*spec.repetitions*2,paidCalls:0},null,2));}
  else if(action==='report'&&path){const report=JSON.parse(readWorkspaceFile(process.cwd(),path).text);if(report.schemaVersion!==1||!Array.isArray(report.rows)||!report.summary)throw Error('invalid-report');process.stdout.write(renderReport(report));}
  else throw Error('usage: node cli.js validate <spec.json> | report <benchmark.json>');
}catch(error){console.error(String(error.message));process.exitCode=1;}
