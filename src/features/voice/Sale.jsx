import React,{useState,useRef,useEffect} from 'react';
import {useSearchParams,Link} from 'react-router-dom';
import {useQueryClient} from '@tanstack/react-query';
import {api,refresh,demo,pendingKey,readPending,writePending,clearPending} from '../../api.js';
import {toMinor,formatMoney as fmt} from '../../money.js';
import {Title,QueryState,useList} from '../../shared.jsx';
import {Stats} from '../summary/Summary.jsx';
import {CustomerForm} from '../ledger/Ledger.jsx';
import {emptyForm as empty,draftForm,loadEntry,saveEntry,recoveryMessage,audioMimeType} from './entry.js';
import {startRecording,microphoneError} from './recorder.js';
import {VoiceInput} from './VoiceInput.jsx';
export function Sale({aiMode=false}){
 const client=useQueryClient(),[params]=useSearchParams(),customers=useList('customers','/customers'),sales=useList('open','/operations?outstanding_only=true');
 const [pending,P]=useState(()=>readPending('pending'));
 const [entryKey]=useState(()=>pendingKey('entry')),[restored]=useState(()=>params.get('sale')?null:loadEntry(entryKey));
 const [stage,S]=useState(pending?'checking':params.get('sale')||restored?'review':'idle'),[form,F]=useState(restored?.form||{...empty,kind:params.get('sale')?'repayment':'sale',sale:params.get('sale')||''}),[text,T]=useState(restored?.text||''),[draft,D]=useState(null),[message,M]=useState(''),[file,A]=useState(null),[url,U]=useState(''),[seconds,SE]=useState(0),[mode,MO]=useState(restored?.mode||'voice'),[newCustomer,NC]=useState(false),[recovering,REC]=useState(false);
 const [locale,LO]=useState(restored?.locale||'auto'),[deviceId,DEVICE]=useState(''),[level,LEVEL]=useState(0),[clarification,CL]=useState('');
 const recorder=useRef(null),lock=useRef(false),mounted=useRef(true),analysis=useRef(null),analyseRecording=useRef(false),micRequest=useRef(0);
 const set=(key,value)=>F(f=>({...f,[key]:value}));
 useEffect(()=>{if(aiMode)MO('voice')},[aiMode]);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;recorder.current?.dispose();analysis.current?.abort()}},[]);
 useEffect(()=>{if(stage==='saved'){clearPending(entryKey);return}saveEntry(entryKey,{form,text,mode,locale})},[entryKey,form,text,mode,locale,stage]);
 useEffect(()=>{if(!file){U('');return}const object=URL.createObjectURL(file);U(object);return()=>URL.revokeObjectURL(object)},[file]);
 function stop(cancel=false,analyse=false){analyseRecording.current=analyse;if(cancel){micRequest.current++;recorder.current?.dispose();lock.current=false;A(null);S('idle');SE(0)}else recorder.current?.stop()}
 function upload(f){if(!f)return;if(!f.size||f.size>8*1024*1024||!audioMimeType(f)){M('8 МБ-тан кіші аудиофайл таңдаңыз');return}A(f);D(null);CL('');M('');REC(false);S('ready')}
 function inputText(value){T(value);A(null);D(null);CL('');M('');REC(false);S('idle')}
 function cancelAnalysis(){analysis.current?.abort();analysis.current=null;lock.current=false;M('Талдау тоқтатылды. Енгізгеніңіз сақталды.');S(draft?'review':'idle')}
 async function record(){
  if(lock.current)return;lock.current=true;M('');REC(false);D(null);CL('');S('requesting');
  const request=++micRequest.current;
  try{
   recorder.current?.dispose();
   analyseRecording.current=false;
   const active=()=>mounted.current&&request===micRequest.current;
   const recording=await startRecording({deviceId,onSeconds:n=>{if(active())SE(n)},onLevel:n=>{if(active())LEVEL(n)},onState:s=>{if(active())S(s)},onReady:blob=>{if(active()){A(blob);S('ready');if(analyseRecording.current)parse({audio:blob})}},onError:message=>{if(active()){M(message);S('error')}}});
   if(!active()){recording.dispose();return}
   recorder.current=recording;A(null);SE(0);S('recording');
  }catch(error){if(mounted.current&&request===micRequest.current){M(microphoneError(error));S('error')}}finally{if(request===micRequest.current)lock.current=false}
 }
 async function parse({audio=file,inputText:textToParse=text}={}){
  if(lock.current)return;lock.current=true;M('');REC(false);S('parsing');
  const controller=new AbortController();analysis.current=controller;
  try{
   const body=new FormData();
   if(audio){
    if(!audio.size||audio.size>8*1024*1024)throw Error('Бос емес, 8 МБ-тан кіші аудиофайл таңдаңыз.');
    const type=audioMimeType(audio);
    if(!type)throw Error('WAV, MP3, M4A, OGG немесе WebM аудиосын таңдаңыз.');
    body.append('audio',new Blob([audio],{type}),audio.name||'recording.webm');
   }else body.append('text',textToParse);
   body.append('locale',locale);
   const d=await api('/drafts',{method:'POST',body,signal:controller.signal});const next=draftForm(d);
   if(!mounted.current||controller.signal.aborted||analysis.current!==controller)return;
   D(d);F(next);CL('');S('review');
  }catch(e){if(mounted.current&&!controller.signal.aborted&&analysis.current===controller){D(null);M(recoveryMessage(e));REC(true);MO('manual');S('review')}}finally{if(analysis.current===controller){analysis.current=null;lock.current=false}}
 }
 function clarify(){
  const value=`${draft.transcript}\nНақтылау / Уточнение: ${clarification.trim()}`;
  if(value.length>10000){M('Мәтін тым ұзын. Нақтылауды қысқартыңыз.');return}
  T(value);A(null);parse({audio:null,inputText:value});
 }
 const total=toMinor(form.total),paid=toMinor(form.paid),amount=toMinor(form.amount),balance=sales.data?.find(s=>s.id===form.sale)?.outstanding_minor;
 const valid=form.kind==='sale'?total>0&&paid!==null&&paid<=total&&(paid===total||customers.data?.some(c=>c.id===form.customer)):form.kind==='repayment'&&amount>0&&balance!=null&&amount<=balance;
 async function save(){if(lock.current||(!pending&&!valid))return;lock.current=true;M('');const storageKey=pendingKey('pending');const request=pending||{key:crypto.randomUUID(),body:JSON.stringify(form.kind==='sale'?{kind:'sale',draft_id:draft?.id||null,description:form.description,customer_id:form.customer||null,total_minor:total,received_minor:paid}:{kind:'repayment',draft_id:draft?.id||null,description:form.description,sale_id:form.sale,amount_minor:amount})};S('saving');try{if(!pending)writePending(storageKey,request);P(request);await api('/operations',{method:'POST',body:request.body},request.key);P(null);clearPending(storageKey);REC(false);M('');S('saved');await refresh(client)}catch(e){if(e.message==='NETWORK_UNKNOWN'){S('checking');M('Сақталу нәтижесі белгісіз. Сол сұрауды қайталап, нәтижесін тексеріңіз.')}else{P(null);clearPending(storageKey);S('review');if(e.code==='DRAFT_EXPIRED'){D(null);M('Жазбаның тексеру мерзімі өтті. Өрістер сақталды: тексеріп, қайта растаңыз.')}else M(e.message);await refresh(client)}}finally{lock.current=false}}
 const busy=['saving','parsing','requesting','recording','paused'].includes(stage)||!!pending;
 return <><Title title={aiMode?"AI көмекшісі":"Жаңа жазба"}>Саудаңызды айтыңыз. Қалғанын реттеуге көмектесеміз.</Title>{mode==='voice'&&<ol className="ai-steps" aria-label="Жазба қадамдары"><li className={!draft&&stage!=='saved'?'current':''}>1 <span>Айтыңыз не жазыңыз</span></li><li className={draft&&stage!=='saved'?'current':''}>2 <span>AI жауабын тексеріңіз</span></li><li className={stage==='saved'?'current':''}>3 <span>Растап сақтаңыз</span></li></ol>}<Stats/><div className="two-column sale-layout"><article className="entry-card"><div className="section-heading"><h2>Сатылымды тіркеу</h2><span className="step">01 / ЕНГІЗУ</span></div><div className="tabs"><button disabled={busy} className={mode==='voice'?'selected':''} onClick={()=>MO('voice')}>✦ AI · Дауыс / мәтін</button><button disabled={busy} className={mode==='manual'?'selected':''} onClick={()=>{MO('manual');D(null);S('review')}}>✎ Қолмен енгізу</button></div>{mode==='voice'?<VoiceInput stage={stage} busy={busy} text={text} onText={inputText} file={file} url={url} onUpload={upload} onRemove={()=>A(null)} locale={locale} onLocale={LO} deviceId={deviceId} onDevice={DEVICE} seconds={seconds} level={level} onRecord={record} onStop={analyse=>stop(false,analyse)} onCancelRecording={()=>stop(true)} onPause={()=>recorder.current?.pause()} onResume={()=>recorder.current?.resume()} onParse={()=>parse()} onCancelParse={cancelAnalysis}/>:<div className="manual-intro"><span className="large-icon">✎</span><h2>Барлығы өз бақылауыңызда</h2><p>Оң жақтағы өрістерді толтырыңыз. Растамайынша операция сақталмайды.</p></div>}{mode==='manual'&&stage==='parsing'&&<button className="secondary" onClick={cancelAnalysis}>Талдауды тоқтату</button>}{message&&<div className={recovering?'recovery-notice':'error'} role={recovering?'status':'alert'}><p>{message}</p>{recovering&&<><button className="secondary" disabled={busy||(!file&&!text.trim())} onClick={parse}>Қайта талдау</button><small>Ақша тек өзіңіз растағаннан кейін жазылады.</small></>}</div>}{mode==='manual'&&(text||url)&&<div className="transcript"><small>Бастапқы жазба</small>{text&&<p>{text}</p>}{url&&<audio controls src={url}/>}</div>}{stage==='error'&&<button className="secondary" onClick={()=>{MO('manual');D(null);S('review')}}>Қолмен толтыру</button>}</article><article className="review-card"><div className="section-heading"><h2>Тексеру және растау</h2><span className="step">02 / РАСТАУ</span></div>{stage==='saved'?<div className="success" role="status"><span>✓</span><h2>Жазба сақталды</h2><p>{demo?'Оқу журналы':'Сервер'} сақтауды растады. Қарыз бен қорытынды жаңартылды.</p><button onClick={()=>{F(empty);D(null);CL('');T('');A(null);M('');REC(false);S('idle');MO('voice')}}>Жаңа операция</button><p><Link to="/seller/history">Тарихты ашу →</Link></p></div>:pending?<div className="confirmation"><h2>{stage==='saving'?'Сақталуда…':'Сақталуын тексеру'}</h2><p>Қайталанған сұрау сол кілтпен және сол сомамен жіберіледі.</p><button disabled={stage==='saving'} onClick={save}>Нәтижесін тексеру</button></div>:['review','error'].includes(stage)?<>{draft&&<div className="transcript"><small>AI мәтіні · тексеріңіз</small><p>{draft.transcript}</p>{draft.questions.map((q,i)=><p key={i}>{q}</p>)}<details className="clarify-panel"><summary>AI-ға нақтылау немесе мәтінді түзету</summary><p>Сома не төлем қате танылса, дұрысын жазыңыз. AI осы жазбаны қайта талдайды.</p><label>Нақтылау<input disabled={busy} maxLength={1000} value={clarification} onChange={e=>CL(e.target.value)} placeholder="Мысалы: жалпы сома 3500 теңге, төлем 1000 теңге"/></label><button className="secondary" disabled={busy||!clarification.trim()} onClick={clarify}>Нақтылап қайта талдау</button></details></div>}<fieldset disabled={busy}><label>Операция түрі<select value={form.kind} onChange={e=>set('kind',e.target.value)}><option value="">Түрін таңдаңыз</option><option value="sale">Сатылым</option><option value="repayment">Қарызды өтеу</option></select></label><label>Сипаттама<input maxLength={500} value={form.description} placeholder="Мысалы, азық-түлік" onChange={e=>set('description',e.target.value)}/></label>{form.kind==='sale'?<><div className="amount-fields"><label>Сатылым сомасы, ₸<input inputMode="decimal" value={form.total} placeholder="3 000" onChange={e=>set('total',e.target.value)}/></label><label>Алынған ақша, ₸<input inputMode="decimal" value={form.paid} placeholder="Нақты соманы енгізіңіз" onChange={e=>set('paid',e.target.value)}/></label></div><label>Клиент<select value={form.customer} onChange={e=>set('customer',e.target.value)}><option value="">Клиентті таңдаңыз</option>{customers.data?.map(c=><option value={c.id} key={c.id}>{c.display_name} · {c.note||c.id.slice(0,8)}</option>)}</select></label><QueryState query={customers}/><button className="text-button" onClick={()=>NC(!newCustomer)}>＋ Жаңа клиент</button>{total!==null&&paid!==null&&<div className="balance"><span>Қалған төлем</span><strong>{fmt(total-paid)}</strong></div>}{total>paid&&!form.customer&&<small>Қарызға сатылым үшін клиент міндетті.</small>}{paid>total&&total!==null&&<p className="error">Алынған ақша сатылым сомасынан аспауы керек.</p>}</>:form.kind==='repayment'?<><label>Ашық сатылым<select value={form.sale} onChange={e=>set('sale',e.target.value)}><option value="">Сатылымды таңдаңыз</option>{sales.data?.map(s=><option key={s.id} value={s.id}>{customers.data?.find(c=>c.id===s.customer_id)?.display_name} · {s.description||s.id.slice(0,8)} · {fmt(s.outstanding_minor)}</option>)}</select></label><QueryState query={sales}/><label>Төлем сомасы, ₸<input inputMode="decimal" value={form.amount} onChange={e=>set('amount',e.target.value)}/></label>{balance!=null&&<div className="balance"><span>Қазіргі қарыз</span><strong>{fmt(balance)}</strong></div>}{amount>balance&&<p className="error">Төлем қалған қарыздан аспауы керек.</p>}</>:null}<button className="wide" disabled={!valid} onClick={save}>{form.kind==='repayment'?`Төлемді жазу · ${fmt(amount||0)}`:`Сатылымды жазу · ${fmt(total||0)}`}</button></fieldset>{newCustomer&&<div className="inline-create"><h3>Клиент қосу</h3><CustomerForm onCreated={c=>{set('customer',c.id);NC(false)}}/></div>}</>:<div className="review-empty"><div className="paper-icon">✓</div><h3>Алдымен жазба дайындайық</h3><p>Дауыспен айтыңыз немесе қолмен енгізіңіз. Мұнда тексеруге арналған жазба пайда болады.</p><button className="secondary" disabled={busy} onClick={()=>{MO('manual');S('review')}}>Қолмен енгізу</button><small>Ақша тек растағаннан кейін жазылады.</small></div>}</article></div></>;
}
