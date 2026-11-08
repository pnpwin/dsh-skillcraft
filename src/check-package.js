import{readFileSync,readdirSync,statSync,mkdirSync}from'node:fs';import{join,resolve}from'node:path';import{spawnSync}from'node:child_process';
import{fileURLToPath}from'node:url';import{assertRootLayout}from'./layout.js';
const root=resolve(fileURLToPath(new URL('..',import.meta.url))),p=JSON.parse(readFileSync(join(root,'package.json'),'utf8'));assertRootLayout(root);
if(p.name!=='@pnpwin/dsh-skill-creator'||p.exports['.']!=='./src/index.js'||p.dsh?.bundle?.patch!=='./cordis.patch.yml')throw Error('invalid-package');
if(Object.keys(p.dependencies??{}).length||['preinstall','install','postinstall','prepare'].some(k=>p.scripts?.[k]))throw Error('runtime-dependencies-or-hooks');
const files=[];function walk(dir){for(const name of readdirSync(dir)){const path=join(dir,name);if(statSync(path).isDirectory())walk(path);else files.push(path);}}walk(join(root,'src'));
for(const file of files.filter(p=>p.endsWith('.js'))){const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});if(r.status!==0)throw Error(r.stderr||'syntax-failed');}
for(const lang of ['en','ru']){const v=JSON.parse(readFileSync(join(root,'locale',lang+'.json'),'utf8'));if(!v.meta?.title||!v.meta?.description)throw Error('missing-locales');}
for(const path of ['README.md','README.ru.md','UPSTREAM.md','NOTICE.md','LICENSES/Anthropic-APACHE-2.0.txt','LICENSES/obra-MIT.txt','LICENSES/dsh-skill-loop-MIT.txt','src/skills/dsh-skill-creator/SKILL.md','src/skills/dsh-skill-creator/references/evaluation.md'])readFileSync(join(root,path));
const body=readFileSync(join(root,'src/skills/dsh-skill-creator/SKILL.md'),'utf8');if(!body.startsWith('---\nname: dsh-skill-creator\n')||!body.includes('RED'))throw Error('invalid-skill-resource');
console.log(JSON.stringify({name:p.name,version:p.version,modules:files.filter(p=>p.endsWith('.js')).length,skills:1}));
if(process.argv.includes('--pack')){mkdirSync(join(root,'.release'),{recursive:true});const r=spawnSync('npm',['pack','--pack-destination',join(root,'.release')],{cwd:root,stdio:'inherit'});if(r.status!==0)process.exitCode=r.status??1;}
