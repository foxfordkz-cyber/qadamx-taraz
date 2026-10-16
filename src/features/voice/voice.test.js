import test,{afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {draftForm,emptyForm,loadEntry,saveEntry,recoveryMessage,audioMimeType} from './entry.js';
import {startRecording,microphoneError} from './recorder.js';
import {setIdentity,pendingKey} from '../../api.js';

afterEach(()=>{delete globalThis.sessionStorage;setIdentity(null)});

test('audio uploads tolerate missing browser MIME and audio-only MP4 labeling',()=>{
 assert.equal(audioMimeType({name:'voice.WAV',type:''}),'audio/wav');
 assert.equal(audioMimeType({name:'voice.m4a',type:'application/octet-stream'}),'audio/mp4');
 assert.equal(audioMimeType({name:'voice.mp4',type:'video/mp4'}),'audio/mp4');
 assert.equal(audioMimeType({type:'audio/webm;codecs=opus'}),'audio/webm');
 assert.equal(audioMimeType({name:'photo.png',type:'image/png'}),null);
});

test('missing payment stays empty; ambiguous customers are not selected',()=>{
 const d={id:'draft',transcript:'3000 теңгеге саттым',kind:'sale',total_minor:300000,received_minor:null,customer_candidates:[{id:'a'},{id:'b'}],sale_candidates:[],questions:[]};
 const form=draftForm(d);
 assert.equal(form.total,'3000');assert.equal(form.paid,'');assert.equal(form.customer,'');
 assert.throws(()=>draftForm({...d,customer_candidates:[null]}),/AI/);
 assert.throws(()=>draftForm({...d,total_minor:'300000'}),/AI/);
});

test('draft input survives reload and stays isolated by account',()=>{
 const values=new Map();
 globalThis.sessionStorage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
 setIdentity({id:'a',business_id:'shop-a'});
 const entry={text:'Асқарға 3000 теңгеге саттым',mode:'manual',form:{...emptyForm,total:'3000',paid:'1000'}};
 assert.equal(saveEntry(pendingKey('entry'),entry),true);
 assert.deepEqual(loadEntry(pendingKey('entry')),entry);
 setIdentity({id:'b',business_id:'shop-b'});
 assert.equal(loadEntry(pendingKey('entry')),null);
});

test('broken or unavailable session storage never crashes the editor',()=>{
 globalThis.sessionStorage={getItem:()=>'{invalid',setItem:()=>{throw Error('blocked')}};
 assert.equal(loadEntry('x'),null);assert.equal(saveEntry('x',{}),false);
 globalThis.sessionStorage.getItem=()=>{throw Error('blocked')};
 assert.equal(loadEntry('x'),null);
 assert.match(recoveryMessage({code:'AI_UNAVAILABLE'}),/қолмен/);
});

function recordingHarness({empty=false,failStart=false}={}) {
 let stopped=0,instance;
 class Recorder {
  constructor(){instance=this;this.state='inactive';this.mimeType='audio/webm'}
  start(){if(failStart)throw Error('device lost');this.state='recording'}
  pause(){this.state='paused'}
  resume(){this.state='recording'}
  stop(){this.state='inactive';if(!empty)this.ondataavailable({data:new Blob(['audio'])});this.onstop()}
 }
 return {Recorder,mediaDevices:{getUserMedia:async()=>({getTracks:()=>[{stop:()=>stopped++}]})},get stopped(){return stopped},get instance(){return instance}};
}

test('default recorder format works without isTypeSupported and releases microphone',async()=>{
 const h=recordingHarness();let result;
 const r=await startRecording({...h,onReady:b=>{result=b},onError:assert.fail,onSeconds:()=>{}});
 r.stop();assert.equal(result.size,5);assert.equal(result.type,'audio/webm');assert.ok(h.stopped>0);
});

test('empty recording becomes recoverable feedback, never an upload',async()=>{
 const h=recordingHarness({empty:true});let message;
 const r=await startRecording({...h,onReady:()=>assert.fail('empty audio'),onError:m=>{message=m},onSeconds:()=>{}});
 r.stop();assert.match(message,/жазылмады/);assert.ok(h.stopped>0);
});

test('recorder error releases the microphone and cannot return partial success',async()=>{
 const h=recordingHarness();let errors=0;
 const r=await startRecording({...h,onReady:()=>assert.fail('partial audio'),onError:()=>errors++,onSeconds:()=>{}});
 h.instance.onerror();assert.equal(errors,1);assert.ok(h.stopped>0);r.dispose();
});

test('cancel suppresses late recording results',async()=>{
 const h=recordingHarness();
 const r=await startRecording({...h,onReady:()=>assert.fail('cancelled'),onError:assert.fail,onSeconds:()=>{}});
 r.dispose();assert.ok(h.stopped>0);
});

test('recorder start failure releases the microphone',async()=>{
 const h=recordingHarness({failStart:true});
 await assert.rejects(startRecording({...h,onReady:assert.fail,onError:assert.fail,onSeconds:()=>{}}),/device lost/);
 assert.ok(h.stopped>0);
});

test('permission denial remains recoverable',async()=>{
 const h=recordingHarness();h.mediaDevices.getUserMedia=async()=>{throw Error('Permission denied')};
 await assert.rejects(startRecording({...h,onReady:assert.fail,onError:assert.fail,onSeconds:()=>{}}),/Permission denied/);
});

test('pause freezes the active duration, resume continues, and the cap stops recording',async()=>{
 const h=recordingHarness();let time=0,seconds=0,ready=0;const states=[];
 const r=await startRecording({...h,now:()=>time,onSeconds:n=>seconds=n,onState:s=>states.push(s),onReady:()=>ready++,onError:assert.fail});
 time=3000;r.pause();time=100000;
 await new Promise(resolve=>setTimeout(resolve,120));
 assert.equal(ready,0);assert.equal(seconds,0);assert.equal(h.instance.state,'paused');
 r.resume();time=126000;
 await new Promise(resolve=>setTimeout(resolve,120));
 assert.equal(ready,1);assert.equal(h.instance.state,'inactive');assert.deepEqual(states,['recording','paused','recording']);
 r.dispose();
});

test('chosen device is requested and the meter releases its audio context',async()=>{
 const h=recordingHarness();let constraints,closed=0,level=0;
 const original=h.mediaDevices.getUserMedia;
 h.mediaDevices.getUserMedia=async options=>{constraints=options;return original()};
 class Context {
  createAnalyser(){return {fftSize:256,getByteTimeDomainData:buffer=>buffer.fill(160)}}
  createMediaStreamSource(){return {connect(){},disconnect(){}}}
  resume(){return Promise.resolve()}
  close(){closed++;return Promise.resolve()}
 }
 const r=await startRecording({...h,Context,deviceId:'usb-mic',onLevel:n=>{level=Math.max(level,n)},onSeconds:()=>{},onReady:()=>{},onError:assert.fail});
 await new Promise(resolve=>setTimeout(resolve,120));
 assert.equal(constraints.audio.deviceId.exact,'usb-mic');assert.ok(level>0);
 r.stop();r.dispose();assert.equal(closed,1);assert.equal(h.stopped,1);
});

test('microphone errors explain permissions and disconnected devices separately',()=>{
 assert.match(microphoneError({name:'NotAllowedError'}),/Рұқсат ету/);
 assert.match(microphoneError({name:'OverconstrainedError'}),/Әдепкі микрофон/);
});
