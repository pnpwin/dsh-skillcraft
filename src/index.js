import {hostImport} from './host-imports.js';
import {installRuntime} from './runtime.js';
const [{default:z},{createUserMessage},{NativeToolExecutor}]=await Promise.all([hostImport('@deepseek-ai/schemastery'),hostImport('@deepseek-ai/dsh-llm'),hostImport('@deepseek-ai/dsh-tool-executor-native')]);
export const name='dsh-skill-creator';
export const inject=['skills','tools','agentLoop','jobs','workingDirectory'];
export const Config=z.object({maxLogicalCalls:z.natural().min(1).max(200).default(18),timeoutMs:z.natural().min(5000).max(300000).default(300000),maxSteps:z.natural().min(1).max(12).default(4),maxOutputTokens:z.natural().min(256).max(6000).default(1500)});
export function apply(ctx,config){return installRuntime(ctx,config,{NativeToolExecutor,createUserMessage});}
