import {spawnSync} from 'node:child_process';
import {existsSync,copyFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const python=path.join(root,'.venv',process.platform==='win32'?'Scripts/python.exe':'bin/python');
function run(command,args){const result=spawnSync(command,args,{cwd:root,stdio:'inherit',windowsHide:true});if(result.status!==0)process.exit(result.status||1)}
if(!existsSync(python))run(process.platform==='win32'?'python':'python3',['-m','venv','.venv']);
run(python,['-m','pip','install','pip==25.3','--timeout','120']);
run(python,['-m','pip','install','-r','backend/requirements.lock.txt','--timeout','120','--retries','5','--resume-retries','10']);
if(!existsSync(path.join(root,'backend/.env')))copyFileSync(path.join(root,'backend/.env.example'),path.join(root,'backend/.env'));
console.log('Дайын. Дауыс тану үшін backend/.env ішіне AI_API_KEY енгізіңіз. Іске қосу: npm run dev');
