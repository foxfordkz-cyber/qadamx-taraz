// Only user-started recording; no microphone access during module import.
export async function startRecording({onReady,onError,onSeconds,mediaDevices=navigator.mediaDevices,Recorder=window.MediaRecorder}) {
  if(!mediaDevices?.getUserMedia || !Recorder) throw Error('Микрофон қолжетімсіз. Мәтін немесе аудиофайл енгізіңіз.');
  const source=await mediaDevices.getUserMedia({audio:true});
  let recorder,timer,closed=false,failed=false,seconds=0;
  const release=()=>{clearInterval(timer);source.getTracks().forEach(track=>track.stop())};
  const stop=()=>{clearInterval(timer);if(recorder?.state==='recording')recorder.stop();release()};
  const dispose=()=>{closed=true;stop()};
  try {
    const mime=['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/ogg;codecs=opus'].find(type=>Recorder.isTypeSupported?.(type));
    // Browsers without isTypeSupported can use their default encoding.
    recorder=mime?new Recorder(source,{mimeType:mime}):new Recorder(source);
    const chunks=[];
    recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
    recorder.onerror=()=>{if(closed||failed)return;failed=true;stop();onError('Дауыс жазу үзілді. Қайта жазыңыз немесе мәтін енгізіңіз.')};
    recorder.onstop=()=>{
      release();
      if(closed||failed)return;
      const blob=new Blob(chunks,{type:recorder.mimeType||chunks[0]?.type||mime||'audio/webm'});
      if(!blob.size){onError('Дауыс жазылмады. Қайта жазыңыз немесе мәтін енгізіңіз.');return}
      if(blob.size>8*1024*1024){onError('Аудио тым үлкен. Қысқа жазба жасаңыз.');return}
      onReady(blob);
    };
    recorder.start();
    timer=setInterval(()=>{onSeconds(++seconds);if(seconds>=30)stop()},1000);
    return {stop,dispose};
  } catch(error) {closed=true;release();throw error;}
}
