import test,{afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {api,authApi,setIdentity,pendingKey,fetchList,writePending,clearPending} from './api.js';
const originalFetch=globalThis.fetch;
afterEach(()=>{globalThis.fetch=originalFetch;setIdentity(null);delete globalThis.sessionStorage;delete globalThis.window});
const user={id:'owner-a',business_id:'shop-a'};
const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});

test('API uses authenticated business, cookies and exact idempotency key',async()=>{
 setIdentity(user);
 let received;
 globalThis.fetch=async(url,options)=>{received={url,options};return response({operation:{id:'sale-a'}})};
 const body=JSON.stringify({kind:'sale',total_minor:300000,received_minor:300000});
 await api('/operations',{method:'POST',body},'request-1');
 assert.equal(received.url,'/api/v1/businesses/shop-a/operations');
 assert.equal(received.options.credentials,'include');
 assert.equal(received.options.headers['Idempotency-Key'],'request-1');
 assert.equal(received.options.body,body);
 assert.equal(received.options.headers.Authorization,undefined);
});

test('ambiguous save errors do not claim that money was not saved',async()=>{
 setIdentity(user);
 for(const result of [()=>{throw new TypeError('connection lost')},()=>response({},502),()=>new Response('<html>proxy error</html>'),()=>response({unexpected:true})]){
  globalThis.fetch=async()=>result();
  await assert.rejects(api('/operations',{method:'POST',body:'{}'},'same-key'),/NETWORK_UNKNOWN/);
 }
});

test('401 requests login while preserving actionable error',async()=>{
 setIdentity(user);
 globalThis.window=new EventTarget();let expired=false;
 window.addEventListener('qadam-auth-required',()=>{expired=true});
 globalThis.fetch=async()=>response({error:{message:'Сеанс аяқталды'}},401);
 await assert.rejects(api('/customers'),/Сеанс аяқталды/);
 assert.equal(expired,true);
});

test('pending operation identifiers are isolated by account',()=>{
 setIdentity(user);const first=pendingKey('pending');
 setIdentity({id:'owner-b',business_id:'shop-b'});
 assert.notEqual(pendingKey('pending'),first);
});

test('list client fetches every page and rejects repeated cursors',async()=>{
 setIdentity(user);const urls=[];
 globalThis.fetch=async url=>{urls.push(url);return response(url.includes('cursor=')?{items:[{id:2}],next_cursor:null}:{items:[{id:1}],next_cursor:100})};
 assert.deepEqual(await fetchList('/operations?outstanding_only=true'),[{id:1},{id:2}]);
 assert.match(urls[1],/outstanding_only=true&cursor=100/);
 globalThis.fetch=async()=>response({items:[],next_cursor:100});
 await assert.rejects(fetchList('/operations'),/қате/);
});

test('login uses cookies and does not put credentials in URL',async()=>{
 let received;
 globalThis.fetch=async(url,options)=>{received={url,options};return response(user)};
 assert.deepEqual(await authApi('/auth/login',{email:'owner@example.test',password:'test-secret'}),user);
 assert.equal(received.url,'/api/v1/auth/login');
 assert.equal(received.options.credentials,'include');
 assert.equal(received.options.method,'POST');
 assert.equal(JSON.parse(received.options.body).password,'test-secret');
});


test('expired sessions preserve the key of an uncertain money operation',async()=>{
 setIdentity(user);
 globalThis.window=new EventTarget();let expired=false;
 window.addEventListener('qadam-auth-required',()=>{expired=true});
 globalThis.fetch=async()=>response({error:{message:'Session expired'}},401);
 await assert.rejects(api('/operations',{method:'POST',body:'{}'},'original-key'),/NETWORK_UNKNOWN/);
 assert.equal(expired,true);
});

test('blocked browser storage fails before saving and cleanup cannot turn success into failure',()=>{
 globalThis.sessionStorage={setItem(){throw new Error('SecurityError')},removeItem(){throw new Error('SecurityError')}};
 assert.throws(()=>writePending('pending',{key:'original'}),/Браузер/);
 assert.doesNotThrow(()=>clearPending('pending'));
});

test('AI failure keeps its recovery code and never repeats a POST in the frontend',async()=>{
 setIdentity(user);let calls=0;
 globalThis.fetch=async()=>{calls++;return response({error:{code:'AI_UNAVAILABLE',message:'Temporarily unavailable'}},503)};
 await assert.rejects(api('/drafts',{method:'POST',body:new FormData()}),error=>error.code==='AI_UNAVAILABLE'&&error.status===503);
 assert.equal(calls,1);
});

test('HTML proxy failure on login is a readable connection error',async()=>{
 globalThis.fetch=async()=>new Response('<html>Bad Gateway</html>',{status:502});
 await assert.rejects(authApi('/auth/login',{}),error=>error.code==='SERVER_UNAVAILABLE'&&!error.message.includes('JSON'));
});
