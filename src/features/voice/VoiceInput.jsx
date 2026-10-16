import React,{useEffect,useState} from 'react';

export const examples={
 kk:[['Жартылай төлем','Асқарға 3000 теңгеге тауар саттым, 1000 теңгесін төледі.'],['Толық төлем','5000 теңгеге тауар саттым, ақшасын толық алдым.'],['Қарызға сату','Айгүлге 2500 теңгеге тауар бердім, барлығы қарызға.'],['Қарызды өтеу','Асқар бұрынғы қарызынан 500 теңге қайтарды.']],
 ru:[['Частичная оплата','Продал Аскару товар на 3000 тенге, он заплатил 1000 тенге.'],['Полная оплата','Продал товар на 5000 тенге, оплатили полностью.'],['Продажа в долг','Продал Айгуль товар на 2500 тенге, всё в долг.'],['Погашение долга','Аскар вернул 500 тенге из прежнего долга.']],
};

export function VoiceInput({stage,busy,text,onText,file,url,onUpload,onRemove,locale,onLocale,
 deviceId,onDevice,seconds,level,onRecord,onStop,onCancelRecording,onPause,onResume,onParse,onCancelParse}){
 const [devices,setDevices]=useState([]),[dragging,setDragging]=useState(false),[elapsed,setElapsed]=useState(0);
 const recording=stage==='recording'||stage==='paused';
 useEffect(()=>{
  const media=navigator.mediaDevices;let active=true;
  const load=async()=>{try{const list=await media?.enumerateDevices?.();if(active)setDevices((list||[]).filter(d=>d.kind==='audioinput'&&d.deviceId))}catch{}};
  load();media?.addEventListener?.('devicechange',load);
  return()=>{active=false;media?.removeEventListener?.('devicechange',load)};
 },[stage==='recording']);
 useEffect(()=>{setElapsed(0);if(stage!=='parsing')return;const started=Date.now();const timer=setInterval(()=>setElapsed(Math.floor((Date.now()-started)/1000)),1000);return()=>clearInterval(timer)},[stage]);
 return <div className="ai-studio">
  <p className="ai-help">Саудаңызды бір сөйлеммен айтыңыз. AI сомалар мен клиентті бөліп береді — сақтамас бұрын өзіңіз тексересіз.</p>
  <div className="voice-settings">
   <label>Тану тілі<select value={locale} disabled={busy} onChange={e=>onLocale(e.target.value)}><option value="auto">Автоматты · KZ / RU</option><option value="kk">Қазақша</option><option value="ru">Русский</option></select></label>
   <label>Микрофон<select value={deviceId} disabled={busy} onChange={e=>onDevice(e.target.value)}><option value="">Әдепкі микрофон</option>{devices.map((d,i)=><option key={d.deviceId} value={d.deviceId}>{d.label||`Микрофон ${i+1}`}</option>)}</select></label>
  </div>
  <div className={'voice-area voice-studio '+(recording?'recording':'')}>
   <span className="voice-status">{stage==='paused'?'Ⅱ Үзіліс':stage==='recording'?'● Дауыс жазылуда':stage==='requesting'?'Рұқсат күтілуде…':'✦ AI ДАУЫС КӨМЕКШІСІ'}</span>
   <button aria-label="Дауыс жазуды бастау" className="mic" disabled={busy} onClick={onRecord}><svg viewBox="0 0 32 32" width="36" fill="none" stroke="currentColor" strokeWidth="2"><rect x="11" y="3" width="10" height="17" rx="5"/><path d="M6 14v2a10 10 0 0 0 20 0v-2M16 26v5M10 31h12"/></svg></button>
   <h2>{recording?`${seconds} / 30 сек`:'Айтыңыз. Тексеріңіз. Растаңыз.'}</h2>
   {stage==='requesting'&&<button className="secondary" onClick={onCancelRecording}>Рұқсат күтуді тоқтату</button>}
   {recording?<><meter aria-label="Микрофон дыбысының деңгейі" min="0" max="100" value={level}/><small>{stage==='paused'?'Жалғастырғанда жазу жалғасады.':'Сөйлегенде дыбыс көрсеткіші қозғалады.'}</small><div className="voice-actions">
    <button onClick={()=>onStop(true)}>Тоқтату және талдау</button>
    <button className="secondary" onClick={stage==='paused'?onResume:onPause}>{stage==='paused'?'Жалғастыру':'Кідірту'}</button>
    <button className="text-button" onClick={()=>onStop(false)}>Алдымен тыңдау</button>
    <button className="text-button" onClick={onCancelRecording}>Бас тарту</button>
   </div></>:<><p>«Асқарға 3 000 теңгеге саттым,<br/>1 000 теңгесін төледі»</p><small>30 секундқа дейін. Талдағанда аудио AI-ға жіберіледі.</small></>}
  </div>
  {url&&<div className="audio-preview"><span className="badge">✓ Аудио дайын</span><audio controls src={url}/><button disabled={busy} className="text-button" onClick={onRemove}>Аудионы алып тастау</button></div>}
  <label className={'upload audio-drop '+(dragging?'dragging':'')} onDragOver={e=>{e.preventDefault();if(!busy)setDragging(true)}} onDragLeave={()=>setDragging(false)} onDrop={e=>{e.preventDefault();setDragging(false);if(!busy)onUpload(e.dataTransfer.files?.[0])}}>Аудиофайлды осында тастаңыз немесе таңдаңыз · 8 МБ дейін
   <input type="file" accept="audio/*,.wav,.mp3,.m4a,.mp4,.webm,.ogg,.opus,.flac,.aac" disabled={busy} onChange={e=>{onUpload(e.target.files?.[0]);e.target.value=''}}/>
  </label>
  <div className="ai-examples"><small>Мысалдан бастаңыз — өз деректеріңізге өзгертіңіз</small><div>{examples[locale==='ru'?'ru':'kk'].map(([label,value])=><button key={label} className="example-chip" disabled={busy} onClick={()=>onText(value)}>{label}</button>)}</div></div>
  <label>Немесе мәтінмен жазыңыз<textarea disabled={busy} maxLength={10000} value={text} placeholder="Кімге, не сатылды, қаншаға және қаншасы төленді?" onChange={e=>onText(e.target.value)}/></label>
  <div className="input-caption"><span>{file?'Талдауға аудио жіберіледі':'Мәтін арқылы да AI жұмыс істейді'}</span><span>{text.length} / 10 000</span></div>
  <button className="wide" onClick={onParse} disabled={busy||(!file&&!text.trim())}>{stage==='parsing'?`AI талдап жатыр… ${elapsed} сек`:'AI арқылы талдау →'}</button>
  {stage==='parsing'&&<div className="analysis-status" role="status"><span className="loading-dot"/>Сомалар мен төлем тексерілуде.<button className="text-button" onClick={onCancelParse}>Талдауды тоқтату</button></div>}
  <details className="voice-tips"><summary>Дауыс жақсы танылуы үшін</summary><ul><li>Бір жазбада бір сатылым не төлем айтыңыз.</li><li>Клиент атын, жалпы соманы және алынған ақшаны атаңыз.</li><li>«Толық төледі», «барлығы қарызға» немесе нақты төлем сомасын айтыңыз.</li><li>Микрофонға рұқсат беріңіз. Шулы жерде мәтін не аудиофайл қолдануға болады.</li></ul></details>
 </div>;
}
