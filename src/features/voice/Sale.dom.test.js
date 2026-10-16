import test,{beforeEach,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,unlink} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import React,{act} from 'react';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {MemoryRouter} from 'react-router-dom';

const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost:5173/'});
globalThis.window=dom.window;globalThis.document=dom.window.document;
globalThis.sessionStorage=dom.window.sessionStorage;
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const {createRoot}=await import('react-dom/client');
const cache=path.resolve('node_modules/.cache/qadam-tests');
await mkdir(cache,{recursive:true});
const bundle=path.join(cache,`sale-${process.pid}.mjs`);
await build({stdin:{contents:"export {Sale} from './src/features/voice/Sale.jsx'; export {setIdentity} from './src/api.js';",resolveDir:process.cwd()},bundle:true,format:'esm',platform:'node',outfile:bundle,external:['react','react-dom/*','react-router-dom','@tanstack/react-query'],logLevel:'silent'});
const {Sale,setIdentity}=await import(pathToFileURL(bundle));
await unlink(bundle);

const originalFetch=globalThis.fetch;
let root,client,requests,handleDraft,handleOperation;
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
const validDraft={id:'draft-1',kind:'sale',transcript:'Асқарға 3000 теңгеге саттым, 1000 төледі',description:'Тауар',total_minor:300000,received_minor:100000,customer_candidates:[{id:'customer-1'}],sale_candidates:[],questions:[]};
const settle=()=>new Promise(resolve=>setTimeout(resolve,30));
async function mount(aiMode=false){
 root=createRoot(document.getElementById('root'));
 await act(async()=>{root.render(React.createElement(QueryClientProvider,{client},React.createElement(MemoryRouter,null,React.createElement(Sale,{aiMode}))));await settle()});
 await act(settle);
}
async function click(text){
 const button=[...document.querySelectorAll('button')].find(b=>b.textContent.includes(text));
 assert.ok(button,`Button ${text} exists`);assert.equal(button.disabled,false,`Button ${text} enabled`);
 await act(async()=>{button.click();await settle()});await act(settle);
}
async function input(element,value){
 assert.ok(element);
 const proto=element.tagName==='TEXTAREA'?window.HTMLTextAreaElement.prototype:element.tagName==='SELECT'?window.HTMLSelectElement.prototype:window.HTMLInputElement.prototype;
 await act(async()=>{Object.getOwnPropertyDescriptor(proto,'value').set.call(element,value);element.dispatchEvent(new window.Event(element.tagName==='SELECT'?'change':'input',{bubbles:true}));await settle()});
}
const field=label=>[...document.querySelectorAll('label')].find(e=>e.textContent.startsWith(label))?.querySelector('input,select,textarea');

beforeEach(async()=>{
 sessionStorage.clear();requests=[];setIdentity({id:'owner-1',business_id:'shop-1'});
 handleDraft=()=>reply({error:{code:'AI_UNAVAILABLE',message:'provider unavailable'}},503);
 handleOperation=()=>reply({operation:{id:'operation-1'}});
 globalThis.fetch=async(url,options={})=>{
  requests.push({url,options});
  if(url.endsWith('/drafts'))return handleDraft();
  if(url.endsWith('/operations')&&options.method==='POST')return handleOperation();
  if(url.includes('/customers'))return reply({items:[{id:'customer-1',display_name:'Асқар'}],next_cursor:null});
  if(url.includes('/summary'))return reply({sales_minor:0,receipts_minor:0,outstanding_minor:0,new_inquiries_count:0});
  return reply({items:[],next_cursor:null});
 };
 client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}});
 await mount();
});
afterEach(async()=>{await act(async()=>root.unmount());client.clear();globalThis.fetch=originalFetch;delete window.MediaRecorder;delete navigator.mediaDevices});

test('AI entry opens the analysis button even when manual mode was previously saved',async()=>{
 await input(document.querySelector('textarea'),'Асқарға 3000 теңгеге саттым');
 await click('Қолмен енгізу');
 await input(field('Сатылым сомасы'),'3000');
 await act(async()=>root.unmount());await mount(true);
 assert.equal(document.querySelector('h1').textContent,'AI көмекшісі');
 assert.equal(document.querySelector('textarea').value,'Асқарға 3000 теңгеге саттым');
 assert.equal(field('Сатылым сомасы').value,'3000');
 handleDraft=()=>reply(validDraft);await click('AI арқылы талдау');
 assert.equal(requests.filter(r=>r.url.endsWith('/drafts')).length,1);
 assert.equal(field('Алынған ақша').value,'1000');
});

test('AI outage opens manual form, keeps input and still allows one confirmed sale',async()=>{
 const text='Асқарға 3000 теңгеге саттым, 1000 төледі';
 await input(document.querySelector('textarea'),text);await click('AI арқылы талдау');
 assert.match(document.querySelector('[role="status"]').textContent,/қолмен/);
 assert.ok(document.body.textContent.includes(text));
 assert.equal(requests.filter(r=>r.url.endsWith('/operations')&&r.options.method==='POST').length,0);
 await input(field('Сатылым сомасы'),'3000');await input(field('Алынған ақша'),'1000');await input(field('Клиент'),'customer-1');
 await click('Сатылымды жазу');
 assert.ok(document.body.textContent.includes('Жазба сақталды'));
 const writes=requests.filter(r=>r.url.endsWith('/operations')&&r.options.method==='POST');
 assert.equal(writes.length,1);assert.equal(JSON.parse(writes[0].options.body).draft_id,null);
 assert.equal(JSON.parse(writes[0].options.body).total_minor,300000);
 assert.equal(sessionStorage.getItem('qadam-owner-1-entry'),null);
});

test('retry uses original input and successful AI response fills the review',async()=>{
 await input(document.querySelector('textarea'),'test sale');await click('AI арқылы талдау');
 handleDraft=()=>reply(validDraft);await click('Қайта талдау');
 assert.equal(field('Сатылым сомасы').value,'3000');assert.equal(field('Алынған ақша').value,'1000');
 assert.equal(document.querySelector('.recovery-notice'),null);
 const drafts=requests.filter(r=>r.url.endsWith('/drafts'));
 assert.equal(drafts.length,2);assert.equal(drafts[1].options.body.get('text'),'test sale');
});

test('edited fields and source text return after remount',async()=>{
 await input(document.querySelector('textarea'),'saved input');await click('Қолмен енгізу');
 await input(field('Сатылым сомасы'),'3000');await input(field('Алынған ақша'),'1000');
 await act(async()=>root.unmount());await mount();
 assert.equal(field('Сатылым сомасы').value,'3000');assert.equal(field('Алынған ақша').value,'1000');
 assert.ok(document.body.textContent.includes('saved input'));
});

test('expired draft keeps fields and next explicit save uses manual confirmation',async()=>{
 handleDraft=()=>reply(validDraft);await input(document.querySelector('textarea'),'test sale');await click('AI арқылы талдау');
 handleOperation=()=>reply({error:{code:'DRAFT_EXPIRED',message:'expired'}},409);await click('Сатылымды жазу');
 assert.equal(field('Сатылым сомасы').value,'3000');
 handleOperation=()=>reply({operation:{id:'operation-2'}});await click('Сатылымды жазу');
 const writes=requests.filter(r=>r.url.endsWith('/operations')&&r.options.method==='POST');
 assert.equal(JSON.parse(writes[0].options.body).draft_id,'draft-1');
 assert.equal(JSON.parse(writes[1].options.body).draft_id,null);
 assert.ok(document.body.textContent.includes('Жазба сақталды'));
});

test('audio remains available for retry after AI outage with missing browser MIME',async()=>{
 const upload=document.querySelector('input[type="file"]');
 const file=new File(['synthetic-audio'],'sample.wav',{type:''});
 Object.defineProperty(upload,'files',{value:[file]});
 await act(async()=>{upload.dispatchEvent(new window.Event('change',{bubbles:true}));await settle()});
 await click('AI арқылы талдау');
 assert.ok(document.querySelector('audio'));
 handleDraft=()=>reply(validDraft);await click('Қайта талдау');
 const requestsToAI=requests.filter(r=>r.url.endsWith('/drafts'));
 assert.equal(requestsToAI.length,2);
 for(const request of requestsToAI){
  const uploaded=request.options.body.get('audio');
  assert.equal(uploaded.type,'audio/wav');assert.equal(await uploaded.text(),'synthetic-audio');
 }
 assert.equal(field('Алынған ақша').value,'1000');
});

test('lost save response retries the same operation key without a second new sale',async()=>{
 handleDraft=()=>reply(validDraft);await input(document.querySelector('textarea'),'test sale');await click('AI арқылы талдау');
 handleOperation=()=>{throw new TypeError('connection lost')};await click('Сатылымды жазу');
 assert.ok(document.body.textContent.includes('Сақталу нәтижесі белгісіз'));
 handleOperation=()=>reply({operation:{id:'same-operation'}});await click('Нәтижесін тексеру');
 const writes=requests.filter(r=>r.url.endsWith('/operations')&&r.options.method==='POST');
 assert.equal(writes.length,2);
 assert.equal(writes[0].options.headers['Idempotency-Key'],writes[1].options.headers['Idempotency-Key']);
 assert.equal(writes[0].options.body,writes[1].options.body);
 assert.ok(document.body.textContent.includes('Жазба сақталды'));
});

test('Russian examples only fill input; selected language reaches the AI request',async()=>{
 await input(field('Тану тілі'),'ru');await click('Частичная оплата');
 assert.match(document.querySelector('textarea').value,/3000 тенге/);
 assert.equal(requests.filter(r=>r.url.endsWith('/drafts')).length,0);
 handleDraft=()=>reply(validDraft);await click('AI арқылы талдау');
 const request=requests.find(r=>r.url.endsWith('/drafts'));
 assert.equal(request.options.body.get('locale'),'ru');
});

test('cancellation preserves input and ignores a late answer after a new analysis',async()=>{
 let finishOld;handleDraft=()=>new Promise(resolve=>{finishOld=resolve});
 await input(document.querySelector('textarea'),'old input');await click('AI арқылы талдау');
 await click('Талдауды тоқтату');assert.equal(document.querySelector('textarea').value,'old input');
 handleDraft=()=>reply({...validDraft,total_minor:350000});
 await input(document.querySelector('textarea'),'new input');await click('AI арқылы талдау');
 assert.equal(field('Сатылым сомасы').value,'3500');
 await act(async()=>{finishOld(reply(validDraft));await settle()});
 assert.equal(field('Сатылым сомасы').value,'3500');
});

test('clarification reuses the transcript and updates the draft without writing money',async()=>{
 handleDraft=()=>reply(validDraft);await input(document.querySelector('textarea'),'original sale');await click('AI арқылы талдау');
 await input(field('Нақтылау'),'Жалпы сома 3500 теңге');
 handleDraft=()=>reply({...validDraft,id:'draft-2',total_minor:350000});
 await click('Нақтылап қайта талдау');
 const drafts=requests.filter(r=>r.url.endsWith('/drafts'));
 assert.ok(drafts[1].options.body.get('text').includes(validDraft.transcript));
 assert.match(drafts[1].options.body.get('text'),/3500/);
 assert.equal(drafts[1].options.body.get('audio'),null);
 assert.equal(field('Сатылым сомасы').value,'3500');
 assert.equal(requests.filter(r=>r.url.endsWith('/operations')&&r.options.method==='POST').length,0);
});

test('microphone pause and stop-and-analyse send one recording to AI',async()=>{
 let stopped=0;
 Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>({getTracks:()=>[{stop:()=>stopped++}]}),enumerateDevices:async()=>[]}});
 window.MediaRecorder=class {
  constructor(){this.state='inactive';this.mimeType='audio/webm'}
  start(){this.state='recording'}pause(){this.state='paused'}resume(){this.state='recording'}
  stop(){this.state='inactive';this.ondataavailable({data:new Blob(['recording'])});this.onstop()}
 };
 handleDraft=()=>reply(validDraft);
 await act(async()=>{document.querySelector('[aria-label="Дауыс жазуды бастау"]').click();await settle()});
 await click('Кідірту');assert.ok(document.body.textContent.includes('Үзіліс'));
 await click('Жалғастыру');await click('Тоқтату және талдау');
 const drafts=requests.filter(r=>r.url.endsWith('/drafts'));
 assert.equal(drafts.length,1);assert.equal(await drafts[0].options.body.get('audio').text(),'recording');
 assert.equal(field('Сатылым сомасы').value,'3000');assert.equal(stopped,1);
});

test('cancelled microphone permission cannot start a late recording or block text input',async()=>{
 let grant,stopped=0;
 Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:()=>new Promise(resolve=>grant=resolve),enumerateDevices:async()=>[]}});
 window.MediaRecorder=class {
  constructor(){this.state='inactive';this.mimeType='audio/webm'}
  start(){this.state='recording'}stop(){this.state='inactive';this.onstop()}
 };
 await act(async()=>{document.querySelector('[aria-label="Дауыс жазуды бастау"]').click();await settle()});
 await click('Рұқсат күтуді тоқтату');
 await input(document.querySelector('textarea'),'мәтін сақталды');
 await act(async()=>{grant({getTracks:()=>[{stop:()=>stopped++}]});await settle()});
 assert.equal(document.querySelector('textarea').disabled,false);
 assert.equal(document.querySelector('textarea').value,'мәтін сақталды');assert.equal(stopped,1);
 assert.equal(document.querySelector('meter'),null);
});
