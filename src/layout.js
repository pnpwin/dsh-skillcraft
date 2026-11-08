import{readdirSync}from'node:fs';
const metadata=new Set(['package.json','package-lock.json','pnpm-lock.yaml','cordis.patch.yml','README.md','README.ru.md','LICENSE','UPSTREAM.md','NOTICE.md','CONTRACT.md','AGENTS.md','.gitignore','.gitattributes']);
// Inspect root files only. Existing tests, locale and other resource directories are untouched.
export function assertRootLayout(root){for(const e of readdirSync(root,{withFileTypes:true}))if(e.isFile()&&!metadata.has(e.name))throw Error('Unexpected root file: '+e.name+'; implementation/build/CLI/benchmark code belongs in src/');return true;}
