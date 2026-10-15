import { localDate } from './money.js';
export function createLedger(state = { customers: [], operations: [], keys: {} }) {
  const balance = id => state.operations.filter(o => o.sale_id === id).reduce((n,o) => n + o.sales_delta_minor - o.receipts_delta_minor, 0);
  const reversed = id => state.operations.some(o => o.reversal_of === id);
  function write(body, key, reverseId) {
    if (!key) throw Error('Idempotency-Key қажет');
    const signature = JSON.stringify({body, reverseId});
    if (state.keys[key]) {
      if (state.keys[key].signature !== signature) throw Error('IDEMPOTENCY_CONFLICT');
      return state.keys[key].result;
    }
    const id = crypto.randomUUID();
    let row = { id, created_at: new Date().toISOString(), description: body.description || '', sales_delta_minor: 0, receipts_delta_minor: 0 };
    if (reverseId) {
      const old = state.operations.find(o => o.id === reverseId);
      if (!old || old.kind === 'reversal' || reversed(old.id)) throw Error('Бұл жазба бұрын жойылған немесе табылмады');
      if (old.kind === 'sale' && state.operations.some(o => o.sale_id === old.id && o.kind === 'repayment' && !reversed(o.id))) throw Error('DEPENDENT_PAYMENTS: алдымен байланысты төлемдерді қайтарыңыз');
      row = {...row, kind:'reversal', sale_id:old.sale_id, customer_id:old.customer_id, reversal_of:old.id, description:old.description, sales_delta_minor:-old.sales_delta_minor, receipts_delta_minor:-old.receipts_delta_minor};
    } else if (body.kind === 'sale') {
      const {total_minor:t, received_minor:r, customer_id:c} = body;
      if (!Number.isSafeInteger(t) || !Number.isSafeInteger(r) || t<=0 || t>10000000000 || r<0 || r>t) throw Error('INVALID_AMOUNT');
      if ((t>r && !c) || (c && !state.customers.some(x=>x.id===c))) throw Error('CUSTOMER_REQUIRED');
      row = {...row, kind:'sale', sale_id:id, customer_id:c, sales_delta_minor:t, receipts_delta_minor:r};
    } else if (body.kind === 'repayment') {
      const sale = state.operations.find(o=>o.id===body.sale_id && o.kind==='sale');
      if (!sale || !Number.isSafeInteger(body.amount_minor) || body.amount_minor<=0 || body.amount_minor>balance(sale.id)) throw Error('BALANCE_CHANGED');
      row = {...row, kind:'repayment', sale_id:sale.id, customer_id:sale.customer_id, receipts_delta_minor:body.amount_minor};
    } else throw Error('Операция түрін таңдаңыз');
    state.operations.push(row);
    const result = {operation:row, sale_balance_minor:balance(row.sale_id), created_at:row.created_at};
    state.keys[key] = {signature,result};
    return result;
  }
  return { state, balance, write, list: () => state.operations.map(o=>({...o, outstanding_minor:balance(o.sale_id), reversed:reversed(o.id)})).reverse(), summary(date) {
    const day = state.operations.filter(o=>localDate(new Date(o.created_at))===date);
    return { sales_minor:day.reduce((n,o)=>n+o.sales_delta_minor,0), receipts_minor:day.reduce((n,o)=>n+o.receipts_delta_minor,0), outstanding_minor:state.operations.reduce((n,o)=>n+o.sales_delta_minor-o.receipts_delta_minor,0), new_inquiries_count:0 };
  }};
}
export async function demoApi(path, options={}, key) {
  const ledger = createLedger(JSON.parse(localStorage.getItem('qadam-demo-v1') || 'null') || undefined);
  const url = new URL(path,'http://demo');
  const body = typeof options.body==='string' ? JSON.parse(options.body) : {};
  let result;
  if (url.pathname==='/drafts') throw Error('Оқу режимінде AI қосылмаған. Мәтінді сақтап, қолмен толтырыңыз.');
  if (url.pathname==='/customers') {
    if (options.method==='POST') {
      if (!body.display_name?.trim()) throw Error('Клиент атын жазыңыз');
      const customer = {id:crypto.randomUUID(), ...body}; ledger.state.customers.push(customer); result=customer;
    } else result={items:ledger.state.customers.map(c=>({...c,outstanding_minor:ledger.state.operations.filter(o=>o.customer_id===c.id).reduce((n,o)=>n+o.sales_delta_minor-o.receipts_delta_minor,0)}))};
  } else if (url.pathname==='/summary') result=ledger.summary(url.searchParams.get('date'));
  else if (url.pathname.endsWith('/reverse')) result=ledger.write(body,key,url.pathname.split('/')[2]);
  else if (url.pathname==='/operations' && options.method==='POST') result=ledger.write(body,key);
  else if (url.pathname==='/operations') result={items:ledger.list().filter(o=>!url.searchParams.has('outstanding_only') || (o.kind==='sale' && o.outstanding_minor>0))};
  else throw Error('Оқу режимінде бұл әдіс жоқ');
  if (options.method==='POST') localStorage.setItem('qadam-demo-v1',JSON.stringify(ledger.state));
  return result;
}
