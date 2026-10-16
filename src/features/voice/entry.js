export const emptyForm = {kind:'sale',description:'',total:'',paid:'',amount:'',customer:'',sale:''};

export function audioMimeType(file) {
  const type=(file.type||'').split(';')[0].toLowerCase();
  if(['audio/webm','audio/mp4','audio/ogg','audio/wav','audio/x-wav','audio/mpeg','audio/mp3','audio/flac','audio/aac','audio/x-m4a'].includes(type))return type;
  // Windows may provide no MIME or label an audio-only MP4 as video/mp4.
  // The server still decodes and validates the actual bytes and duration.
  return {wav:'audio/wav',mp3:'audio/mpeg',m4a:'audio/mp4',mp4:'audio/mp4',webm:'audio/webm',ogg:'audio/ogg',opus:'audio/ogg',flac:'audio/flac',aac:'audio/aac'}[file.name?.split('.').pop().toLowerCase()]||null;
}

export function draftForm(d) {
  if (!d || !['sale','repayment','unknown'].includes(d.kind) || typeof d.id!=='string' ||
      typeof d.transcript!=='string' || !Array.isArray(d.customer_candidates) ||
      !Array.isArray(d.sale_candidates) || !Array.isArray(d.questions) ||
      !d.questions.every(q=>typeof q==='string') ||
      ![...d.customer_candidates,...d.sale_candidates].every(c=>c&&typeof c.id==='string') ||
      ['total_minor','received_minor','amount_minor'].some(k=>d[k]!=null&&(!Number.isSafeInteger(d[k])||d[k]<0))) {
    throw Object.assign(new Error('AI жауабы толық емес. Жазбаны қолмен толтырыңыз.'),{code:'AI_INVALID_RESPONSE'});
  }
  return {...emptyForm,kind:d.kind==='unknown'?'':d.kind,description:typeof d.description==='string'?d.description:'',
    total:d.total_minor==null?'':String(d.total_minor/100),paid:d.received_minor==null?'':String(d.received_minor/100),
    amount:d.amount_minor==null?'':String(d.amount_minor/100),
    customer:d.customer_candidates.length===1?d.customer_candidates[0].id:'',
    sale:d.sale_candidates.length===1?d.sale_candidates[0].id:''};
}

export function loadEntry(key) {
  try {
    const saved=JSON.parse(sessionStorage.getItem(key)||'null');
    if (!saved || saved.version!==1) return null;
    const form={...emptyForm};
    for (const field of Object.keys(form)) if(typeof saved.form?.[field]==='string') form[field]=saved.form[field];
    return {form,text:typeof saved.text==='string'?saved.text:'',mode:saved.mode==='manual'?'manual':'voice',...(['auto','kk','ru'].includes(saved.locale)?{locale:saved.locale}:{})};
  } catch { return null; }
}

export function saveEntry(key, entry) {
  try { sessionStorage.setItem(key,JSON.stringify({version:1,...entry}));return true; }
  catch { return false; }
}

export function recoveryMessage(error) {
  if(error.code?.startsWith('AI_')) return 'Дауыс/мәтінді автоматты талдау қазір қолжетімсіз. Енгізгеніңіз осы бетте қалды. Өрістерді қолмен толтырыңыз немесе қайта талдап көріңіз.';
  return error.message || 'Сұрау орындалмады. Енгізгеніңіз осы бетте қалды.';
}
