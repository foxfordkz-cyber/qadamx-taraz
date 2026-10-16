import React, {useState} from 'react';
import {Link} from 'react-router-dom';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {api, demo, fetchList} from '../../api.js';
import {useAuth} from '../../Auth.jsx';
import {Locale, useLocale} from '../explore/locale.jsx';
import {publicList, shopHref} from '../explore/publicApi.js';
import {ApiState} from '../explore/Explore.jsx';

export function SellerInquiries() {return <Locale><Inbox/></Locale>}
function Inbox() {
  const {t,lang,setLang} = useLocale(), {user} = useAuth(), client = useQueryClient();
  const inbox = useQuery({queryKey:['inquiries',user?.id],queryFn:() => fetchList('/inquiries'),enabled:!demo});
  const shop = useQuery({queryKey:['my-storefront',user?.id],queryFn:() => api('/storefront'),enabled:!demo});
  const venues = useQuery({queryKey:['public-venues'],queryFn:() => publicList('/venues'),enabled:!demo});
  const [error,setError] = useState(''), [busy,setBusy] = useState('');
  async function status(id,value) {
    if (busy) return; setBusy(id);setError('');
    try {await api('/inquiries/'+id,{method:'PATCH',body:JSON.stringify({status:value})});await Promise.all([client.invalidateQueries({queryKey:['inquiries']}),client.invalidateQueries({queryKey:['summary']})])}
    catch {setError(t('Өзгеріс сақталмады. Қайта көріңіз.', 'Изменение не сохранено. Повторите.'))}finally{setBusy('')}
  }
  if (demo) return <article>Бұл бөлім нақты сервермен жұмыс істейді. Оқу режимін өшіріп, аккаунтпен кіріңіз.</article>;
  return <div className="public-app seller-inbox"><div className="section-title"><div><p className="eyebrow">QADAM / {t('САТУШЫ', 'ПРОДАВЕЦ')}</p><h1 style={{fontSize:34}}>{t('Витрина және өтінімдер', 'Витрина и заявки')}</h1></div><button onClick={() => setLang(lang==='kk'?'ru':'kk')}>{lang==='kk'?'RU':'KZ'}</button></div>
    {shop.isSuccess && venues.data ? <Publication key={shop.data?.id || user.id} shop={shop.data} venues={venues.data} user={user}/> : <ApiState query={shop.isSuccess?venues:shop}/>}
    <div className="section-title"><h2>{t('Кіріс өтінімдер', 'Входящие заявки')}</h2><button onClick={() => inbox.refetch()} disabled={inbox.isFetching}>{t('Жаңарту', 'Обновить')}</button></div>
    {error && <p role="alert" className="public-error">{error}</p>}
    {inbox.data ? inbox.data.length ? inbox.data.map(item => <article key={item.id} className="inbox-item"><div><strong>{item.number}</strong><time>{new Date(item.created_at).toLocaleString(lang==='kk'?'kk-KZ':'ru-KZ')}</time></div><h3>{item.visitor_name}</h3><p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{item.message}</p><p className="private-contact">{t('Жеке контакт', 'Приватный контакт')}: <b>{item.contact}</b></p><label>{t('Күйі', 'Статус')}<select value={item.status} disabled={!!busy} onChange={e => status(item.id,e.target.value)}><option value="new">{t('Жаңа', 'Новая')}</option><option value="in_progress">{t('Қаралуда', 'В работе')}</option><option value="closed">{t('Жабық', 'Закрыта')}</option></select></label></article>) : <p className="public-note">{t('Әзірге өтінім жоқ. Өз витринаңыздың сілтемесін ашып, өтінімді тексеріңіз.', 'Заявок пока нет. Откройте ссылку своей витрины, чтобы проверить обращение.')}</p> : <ApiState query={inbox}/>}
  </div>;
}
function Publication({shop,venues,user}) {
  const {t} = useLocale(), client = useQueryClient();
  const [form,setForm] = useState({name:shop?.name || user.business_name,venue_id:shop?.venue_id || venues[0]?.id || '',category:shop?.category || 'clothes',description:shop?.description || '',published:shop?.published ?? true});
  const [busy,setBusy] = useState(false), [error,setError] = useState(''), [saved,setSaved] = useState(false);
  const edit = (field,value) => {setForm(f => ({...f,[field]:value}));setSaved(false)};
  async function submit(e) {e.preventDefault();if(busy)return;setBusy(true);setError('');try{await api('/storefront',{method:'POST',body:JSON.stringify(form)});setSaved(true);await Promise.all([client.invalidateQueries({queryKey:['my-storefront']}),client.invalidateQueries({queryKey:['public-shops']}),client.invalidateQueries({queryKey:['public-shop']})])}catch{setError(t('Витрина сақталмады. Өрістерді тексеріп, қайталаңыз.', 'Витрина не сохранена. Проверьте поля и повторите.'))}finally{setBusy(false)}}
  return <details className="publication" open={!shop}><summary>{t('Менің витринам', 'Моя витрина')} {shop?.published ? '●' : '○'}</summary>
    <p className="public-note">{t('Бұл оқу витринасы. Алаңдағы орналасу расталмаған. Тек осы формадағы мәлімет жарияланады; есеп пен клиенттер ашылмайды.', 'Это учебная витрина. Расположение на площадке не подтверждено. Публикуются только данные этой формы; учёт и клиенты остаются закрытыми.')}</p>
    {shop?.published && <Link className="primary-action" to={shopHref(shop)}>{t('Менің ашық парақшам', 'Моя публичная страница')} ↗</Link>}
    <form onSubmit={submit}><fieldset disabled={busy} style={{border:0,padding:0,marginTop:20}}><label>{t('Атауы','Название')}<input required minLength={2} maxLength={120} value={form.name} onChange={e => edit('name',e.target.value)}/></label><label>{t('Алаң','Площадка')}<select value={form.venue_id} onChange={e => edit('venue_id',e.target.value)}>{venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select></label><label>{t('Санат','Категория')}<select value={form.category} onChange={e => edit('category',e.target.value)}><option value="clothes">{t('Киім','Одежда')}</option><option value="food">{t('Азық-түлік','Продукты')}</option><option value="home">{t('Үйге арналған','Для дома')}</option></select></label><label>{t('Сипаттама','Описание')}<textarea required minLength={10} maxLength={2000} value={form.description} onChange={e => edit('description',e.target.value)}/></label><label className="publish-toggle"><input type="checkbox" checked={form.published} onChange={e => edit('published',e.target.checked)}/>{t('Витринада жариялау','Публиковать в витрине')}</label></fieldset><button className="primary-action" disabled={busy}>{busy?t('Сақталуда…','Сохраняем…'):t('Сақтау','Сохранить')}</button>{saved && <p role="status">{t('Сақталды','Сохранено')}</p>}{error && <p role="alert">{error}</p>}</form>
  </details>;
}
