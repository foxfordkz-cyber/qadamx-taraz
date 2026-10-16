// Only a user-started action requests microphone access.
export async function startRecording({onReady,onError,onSeconds,onLevel=()=>{},onState=()=>{},deviceId='',
 mediaDevices=navigator.mediaDevices,Recorder=window.MediaRecorder,Context=globalThis.AudioContext||globalThis.webkitAudioContext,
 now=()=>performance.now()}) {
 if(!mediaDevices?.getUserMedia||!Recorder)throw Error('Микрофон қолжетімсіз. Мәтін немесе аудиофайл енгізіңіз.');
 const source=await mediaDevices.getUserMedia({audio:deviceId?{deviceId:{exact:deviceId},echoCancellation:true,noiseSuppression:true}:true});
 let recorder,timer,context,analyser,input,closed=false,failed=false,released=false,elapsed=0,started=0;
 const release=()=>{
  if(released)return;released=true;clearInterval(timer);source.getTracks().forEach(track=>track.stop());
  try{input?.disconnect();const closing=context?.close();closing?.catch(()=>{})}catch{}
  onLevel(0);
 };
 const stop=()=>{clearInterval(timer);try{if(recorder&&recorder.state!=='inactive')recorder.stop()}finally{release()}};
 const dispose=()=>{closed=true;stop()};
 try {
  const mime=['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/ogg;codecs=opus'].find(type=>Recorder.isTypeSupported?.(type));
  recorder=mime?new Recorder(source,{mimeType:mime}):new Recorder(source);
  const chunks=[];
  recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
  recorder.onerror=()=>{if(closed||failed)return;failed=true;stop();onError('Дауыс жазу үзілді. Қайта жазыңыз немесе мәтін енгізіңіз.')};
  recorder.onstop=()=>{
   release();if(closed||failed)return;
   const blob=new Blob(chunks,{type:recorder.mimeType||chunks[0]?.type||mime||'audio/webm'});
   if(!blob.size){onError('Дауыс жазылмады. Қайта жазыңыз немесе мәтін енгізіңіз.');return}
   if(blob.size>8*1024*1024){onError('Аудио тым үлкен. Қысқа жазба жасаңыз.');return}
   onReady(blob);
  };
  // The sound meter is optional; its failure must never prevent recording.
  try{
   if(Context){context=new Context();analyser=context.createAnalyser();analyser.fftSize=256;
    input=context.createMediaStreamSource(source);input.connect(analyser);context.resume()?.catch(()=>{});}
  }catch{analyser=null;}
  const buffer=analyser?new Uint8Array(analyser.fftSize):null;
  recorder.start();started=now();onState('recording');
  timer=setInterval(()=>{
   if(recorder.state!=='recording')return;
   const duration=elapsed+now()-started;onSeconds(Math.floor(duration/1000));
   if(analyser){try{analyser.getByteTimeDomainData(buffer);const rms=Math.sqrt(buffer.reduce((sum,n)=>sum+((n-128)/128)**2,0)/buffer.length);onLevel(Math.min(100,Math.round(rms*300)))}catch{analyser=null}}
   // Leave headroom for browser scheduling/codec padding under the server's 30s cap.
   if(duration>=29000)stop();
  },100);
  return {stop,dispose,pause(){
   if(recorder.state==='recording'&&recorder.pause){elapsed+=now()-started;recorder.pause();onLevel(0);onState('paused')}
  },resume(){
   if(recorder.state==='paused'&&recorder.resume){recorder.resume();started=now();onState('recording')}
  }};
 }catch(error){closed=true;release();throw error;}
}

export function microphoneError(error){
 const messages={
  NotAllowedError:'Микрофонға рұқсат берілмеген. Браузердегі сайт баптауынан «Микрофон → Рұқсат ету» таңдаңыз.',
  NotFoundError:'Микрофон табылмады. Құрылғыны қосып, қайта көріңіз.',
  NotReadableError:'Микрофонды басқа бағдарлама қолданып тұр немесе құрылғы оқылмады. Басқа қолданбаны жауып, қайта көріңіз.',
  OverconstrainedError:'Таңдалған микрофон ажыратылған. «Әдепкі микрофон» таңдаңыз.',
 };
 return messages[error?.name]||'Микрофон қолжетімсіз. Мәтін енгізіңіз немесе аудиофайл жүктеңіз.';
}
