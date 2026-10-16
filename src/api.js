import {demoApi} from './demo.js';
const env=import.meta.env || {};
export const demo = env.VITE_DEMO_MODE === 'true';
export const apiRoot = (env.VITE_API_URL || '/api/v1').replace(/\/$/,'');
function apiError(message, code, status) {
  return Object.assign(new Error(message), {code, status});
}
let identity = null;
export const setIdentity = user => {identity=user};
export const pendingKey = kind => `qadam-${demo?'demo':identity?.id||'anonymous'}-${kind}`;
export function readPending(kind) {try{return JSON.parse(sessionStorage.getItem(pendingKey(kind))||'null')}catch{return null}}
export function writePending(storageKey, request) {
  try {sessionStorage.setItem(storageKey, JSON.stringify(request))}
  catch {throw Error('Браузер уақытша сақтауға рұқсат бермеді. Сақтау орындалмады. Браузер баптауын тексеріңіз.')}
}
export function clearPending(storageKey) {
  try {sessionStorage.removeItem(storageKey)} catch { /* Replaying the same key remains safe. */ }
}
export async function authApi(path, body) {
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),15000);
  try {
    const response = await fetch(apiRoot+path,{method:body?'POST':'GET',credentials:'include',signal:controller.signal,headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});
    let data;
    try { data=await response.json(); }
    catch { throw apiError('Серверге қосылу мүмкін болмады. Қайта көріңіз.', 'SERVER_UNAVAILABLE', response.status); }
    if(!response.ok){const error=new Error(data.error?.message||'Серверге қосылу мүмкін болмады');error.status=response.status;throw error}
    return data;
  } catch(error) {
    if(error.name==='AbortError'||error instanceof TypeError)throw Error('Серверге қосылу мүмкін болмады. Қайта көріңіз.');
    throw error;
  } finally {clearTimeout(timer)}
}
export async function api(path, options={}, key) {
  if (demo) return demoApi(path,options,key);
  if (!identity?.business_id) throw Error('Алдымен жүйеге кіріңіз');
  const base = `${apiRoot}/businesses/${identity.business_id}`;
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if(options.signal?.aborted) cancel();
  else options.signal?.addEventListener('abort',cancel,{once:true});
  const timeout = setTimeout(()=>controller.abort(),30000);
  const headers = {...options.headers};
  if (key) headers['Idempotency-Key']=key;
  if (options.body && !(options.body instanceof FormData)) headers['Content-Type']='application/json';
  try {
    const response = await fetch(base+path,{...options,headers,credentials:'include',signal:controller.signal});
    let data;
    try { data=await response.json(); } catch { throw apiError(key ? 'NETWORK_UNKNOWN' : 'Сервер уақытша қолжетімсіз. Енгізгеніңіз сақталды, қайта көріңіз.', 'SERVER_UNAVAILABLE', response.status); }
    if (!response.ok) {
      if (response.status===401) window.dispatchEvent(new Event('qadam-auth-required'));
      if (key && (response.status>=500 || response.status===401)) throw Error('NETWORK_UNKNOWN');
      throw apiError(data?.error?.message || 'Сұрау орындалмады. Қайта көріңіз.', data?.error?.code || 'SERVER_UNAVAILABLE', response.status);
    }
    if (key && !data?.operation?.id) throw Error('NETWORK_UNKNOWN');
    return data;
  } catch (error) {
    if(options.signal?.aborted) throw apiError(key?'NETWORK_UNKNOWN':'Талдау тоқтатылды. Енгізгеніңіз сақталды.','REQUEST_CANCELLED');
    if (error.name==='AbortError' || error instanceof TypeError) throw apiError(key ? 'NETWORK_UNKNOWN' : 'Серверге қосылу мүмкін болмады. Енгізгеніңіз сақталды, қайта көріңіз.', error.name==='AbortError'?'REQUEST_TIMEOUT':'NETWORK_ERROR');
    throw error;
  } finally {clearTimeout(timeout);options.signal?.removeEventListener('abort',cancel);}
}
export async function fetchList(path) {
  const items=[];
  let cursor=null;
  const seen=new Set();
  do {
    const next=cursor==null?path:`${path}${path.includes('?')?'&':'?'}cursor=${encodeURIComponent(cursor)}`;
    const data=await api(next);
    if(!Array.isArray(data.items)) throw Error('Сервер тізімді дұрыс қайтармады');
    items.push(...data.items);
    cursor=data.next_cursor;
    if(cursor!=null){if(seen.has(cursor))throw Error('Тізім беттерінде қате бар');seen.add(cursor)}
  } while(cursor!=null);
  return items;
}
export const refresh = client => Promise.all(['operations','customers','open','summary'].map(key=>client.invalidateQueries({queryKey:[key]})));
