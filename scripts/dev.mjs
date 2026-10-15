import {spawn,spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const python=path.join(root,'.venv',process.platform==='win32'?'Scripts/python.exe':'bin/python');
if(!existsSync(python)){
 console.error('Алдымен npm run setup командасын орындаңыз.');process.exit(1);
}
const check=spawnSync(python,['-c','import fastapi, uvicorn, google.genai, av, pwdlib'],{cwd:root,stdio:'ignore'});
if(check.status!==0){console.error('Backend пакеттері жоқ. npm run setup командасын орындаңыз.');process.exit(1)}
const children=[];
let stopping=false;
function stop(code=0){
 if(stopping)return;stopping=true;
 for(const child of children){
  if(!child.pid||child.exitCode!==null)continue;
  // Only terminate processes this launcher owns, including the Windows venv child.
  if(process.platform==='win32')spawnSync('taskkill',['/PID',String(child.pid),'/T','/F'],{stdio:'ignore',windowsHide:true});
  else child.kill();
 }
 process.exitCode=code;
}
function launch(command,args){
 const child=spawn(command,args,{cwd:root,stdio:'inherit',windowsHide:true});children.push(child);
 child.on('error',error=>{console.error(error.message);stop(1)});
 child.on('exit',code=>{if(!stopping)stop(code||0)});
}
process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop());
launch(python,['-m','uvicorn','backend.app:app','--host','127.0.0.1','--port','8000']);
let ready=false;
for(let attempt=0;attempt<60&&!stopping;attempt++){
 try{const response=await fetch('http://127.0.0.1:8000/api/v1/health',{signal:AbortSignal.timeout(1000)});if(response.ok){ready=true;break}}catch{}
 await new Promise(resolve=>setTimeout(resolve,250));
}
if(!stopping){
 if(!ready){console.error('API іске қосылмады. Жоғарыдағы қатені тексеріңіз.');stop(1)}
 else{launch(process.execPath,[path.join(root,'node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--strictPort']);console.log('\nQadam: http://127.0.0.1:5173 — тоқтату: Ctrl+C\n')}
}
