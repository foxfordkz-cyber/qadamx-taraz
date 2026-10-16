import test,{beforeEach,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,readFile,unlink} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import React,{act} from 'react';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {MemoryRouter} from 'react-router-dom';

const dom = new JSDOM('<div id="root"></div>',{url:'http://localhost:5173/'});
globalThis.window = dom.window; globalThis.document = dom.window.document;
globalThis.sessionStorage = dom.window.sessionStorage; globalThis.localStorage = dom.window.localStorage;
globalThis.requestAnimationFrame = callback => setTimeout(callback,0);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
window.scrollTo = () => {}; window.HTMLCanvasElement.prototype.getContext = () => null;
const {createRoot} = await import('react-dom/client');
const cache = path.resolve('node_modules/.cache/qadam-tests'); await mkdir(cache,{recursive:true});
const bundle = path.join(cache,`explore-${process.pid}.mjs`);
await build({entryPoints:['src/App.jsx'],bundle:true,format:'esm',platform:'node',outfile:bundle,external:['react','react-dom/*','react-router-dom','@tanstack/react-query'],loader:{'.css':'empty'},logLevel:'silent'});
const {QadamRoutes} = await import(pathToFileURL(bundle)); await unlink(bundle);
const seed = JSON.parse(await readFile('backend/showcase-seed.json','utf8'));
const originalFetch = globalThis.fetch;
let root,client,requests,submitHandler;
const reply = (data,status=200) => new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
const settle = () => new Promise(resolve => setTimeout(resolve,35));
beforeEach(() => {
  localStorage.clear();sessionStorage.clear();requests=[];
  client = new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}});
  submitHandler = () => reply({id:'inquiry-1',number:'Q-000001',status:'new'},201);
  globalThis.fetch = async (url,options={}) => {
    const u = new URL(url,'http://localhost'); requests.push({url:u.pathname,query:u.search,options});
    if (u.pathname.endsWith('/venues')) return reply({items:seed.venues,next_cursor:null});
    if (u.pathname.endsWith('/businesses')) return reply({items:seed.businesses.filter(s => (!u.searchParams.get('venue_id') || s.venue_id===u.searchParams.get('venue_id')) && (!u.searchParams.get('category') || s.category===u.searchParams.get('category')) && (!u.searchParams.get('q') || s.name.toLowerCase().includes(u.searchParams.get('q').toLowerCase()))),next_cursor:null});
    if (u.pathname.endsWith('/inquiries')) return submitHandler(options);
    if (u.pathname.endsWith('/me')) return reply({error:{code:'AUTH_REQUIRED'}},401);
    const shop = seed.businesses.find(s => u.pathname.endsWith('/'+s.slug));
    if (shop) return reply({...shop,inquiry_mode:'training',catalog_items:seed.catalog_items.filter(i => i.business_id===shop.id)});
    return reply({error:{code:'NOT_FOUND'}},404);
  };
});
afterEach(async () => {if(root)await act(async () => root.unmount());root=null;client.clear();globalThis.fetch=originalFetch});
async function mount(route='/') {
  root=createRoot(document.getElementById('root'));
  await act(async () => {root.render(React.createElement(QueryClientProvider,{client},React.createElement(MemoryRouter,{initialEntries:[route]},React.createElement(QadamRoutes))));await settle()});
  await act(settle);await act(settle);
}
async function click(text) {
  const button = [...document.querySelectorAll('button')].find(e => e.textContent.includes(text));assert.ok(button,text);
  await act(async () => {button.click();await settle()});await act(settle);
}
async function fill(name,value) {
  const el = document.querySelector(`[name="${name}"]`);assert.ok(el);
  const proto = el.tagName==='TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  await act(async () => {Object.getOwnPropertyDescriptor(proto,'value').set.call(el,value);el.dispatchEvent(new window.Event('input',{bubbles:true}));await settle()});
}
async function submit() {await act(async () => {document.querySelector('.inquiry-panel form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));await settle()});await act(settle)}

test('public homepage bypasses authentication, three cards work without WebGL and language switches', async () => {
  await mount();assert.equal(requests.some(r => r.url.endsWith('/me')),false);
  const cards = [...document.querySelectorAll('.venue-card')];assert.equal(cards.length,3);
  assert.deepEqual(cards.map(e => e.getAttribute('href')),['/venues/mart','/venues/kaikarmet','/venues/auyl-bereke']);
  assert.match(document.querySelector('.scene-fallback').textContent,/Каталог/);
  await click('RU');assert.equal(document.documentElement.lang,'ru');assert.match(document.querySelector('h1').textContent,/Ваш город/);
});

test('venue URL filters determine API request and normal shop links', async () => {
  await mount('/venues/mart?category=food&q=MART');
  const cards = [...document.querySelectorAll('.public-shop-card')];assert.equal(cards.length,1);
  assert.equal(cards[0].getAttribute('href'),'/shops/mart-demo-food');
  assert.ok(requests.some(r => r.query.includes('category=food') && r.query.includes('q=MART')));
  await click('Киім');assert.equal(document.querySelector('.public-shop-card').getAttribute('href'),'/shops/mart-demo-clothes');
});

test('inquiry retains exact body and request ID after lost response and remount', async () => {
  submitHandler = () => {throw TypeError('network lost after commit')};
  await mount('/shops/mart-demo-food');
  await fill('visitor_name','Visitor');await fill('contact','visitor@example.test');await fill('message','Question about this item');
  await submit();
  const first = requests.find(r => r.options.method==='POST');assert.ok(first);
  assert.equal(document.querySelector('[name="message"]').value,'Question about this item');
  assert.equal(document.querySelector('fieldset').disabled,true);
  await act(async () => root.unmount());root=null;
  submitHandler = () => reply({id:'saved',number:'Q-000025',status:'new'},201);
  await mount('/shops/mart-demo-food');await submit();
  const posts = requests.filter(r => r.options.method==='POST');assert.equal(posts.length,2);
  assert.equal(posts[0].options.body,posts[1].options.body);
  assert.match(document.querySelector('.inquiry-success').textContent,/Q-000025/);
  assert.equal(document.querySelector('.inquiry-panel'),null);
  assert.equal(sessionStorage.getItem('qadam-inquiry-'+seed.businesses.find(s => s.slug==='mart-demo-food').id).includes('visitor@example.test'),false);
});

test('pending submission blocks repeated click; invalid contact is rejected without network', async () => {
  await mount('/shops/mart-demo-home');
  await fill('visitor_name','Visitor');await fill('contact','bad');await fill('message','Question');await submit();
  assert.equal(requests.filter(r => r.options.method==='POST').length,0);
  await fill('contact','+7 700 123 45 67');
  let finish; submitHandler = () => new Promise(resolve => {finish=resolve});
  await submit();assert.equal(document.querySelector('.inquiry-panel button').disabled,true);
  await submit();assert.equal(requests.filter(r => r.options.method==='POST').length,1);
  await act(async () => {finish(reply({id:'saved',number:'Q-000026'}));await settle()});
  assert.match(document.querySelector('.inquiry-success').textContent,/Q-000026/);
});

test('seller route remains protected while public unknown shop gets useful 404', async () => {
  await mount('/seller/ai');assert.ok(requests.some(r => r.url.endsWith('/me')));assert.ok(document.querySelector('.auth-screen'));
  await act(async () => root.unmount());root=null;
  await mount('/shops/missing');assert.match(document.querySelector('h1').textContent,/табылмады/);
});

test('storage denied prevents submission rather than sending without durable retry ID', async () => {
  await mount('/shops/mart-demo-clothes');await fill('visitor_name','Visitor');await fill('contact','visitor@example.test');await fill('message','Question');
  const original = window.Storage.prototype.setItem;window.Storage.prototype.setItem = () => {throw Error('Denied')};
  try {await submit();assert.equal(requests.filter(r => r.options.method==='POST').length,0);assert.ok(document.querySelector('[role="alert"]'))}
  finally {window.Storage.prototype.setItem=original}
});

test('authenticated seller routes reach AI and private inbox within the existing shell', async () => {
  const publicFetch = globalThis.fetch;
  globalThis.fetch = (url,options) => {
    if(url.endsWith('/me')) return reply({id:'owner',business_id:'owned-shop',business_name:'My shop',ai_configured:true});
    if(url.endsWith('/storefront')) return reply(null);
    if(url.endsWith('/inquiries')) return reply({items:[{id:'private-1',number:'Q-000100',visitor_name:'Visitor',contact:'private@example.test',message:'Private question',status:'new',created_at:'2026-10-16T10:00:00Z'}],next_cursor:null});
    if(url.includes('/customers') || url.includes('/operations')) return reply({items:[],next_cursor:null});
    if(url.includes('/summary')) return reply({sales_minor:0,receipts_minor:0,outstanding_minor:0,new_inquiries_count:1});
    return publicFetch(url,options);
  };
  await mount('/seller/ai');assert.ok(document.querySelector('.sidebar'));assert.ok([...document.querySelectorAll('button')].some(b => b.textContent.includes('AI арқылы талдау')));
  await act(async () => root.unmount());root=null;
  await mount('/seller/inquiries');assert.match(document.querySelector('.inbox-item').textContent,/private@example.test/);assert.ok(document.querySelector('.publication form'));
});
