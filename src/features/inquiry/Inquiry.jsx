import React, {useRef, useState} from 'react';
import {useLocale} from '../explore/locale.jsx';
import {publicApi} from '../explore/publicApi.js';

export function validContact(value) {
  const v = value.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || (/^\+?[0-9 ()-]+$/.test(v) && v.replace(/\D/g, '').length >= 10 && v.replace(/\D/g, '').length <= 15);
}
const blank = {visitor_name:'', contact:'', message:''};
function restore(key) {try {return JSON.parse(sessionStorage.getItem(key)) || {form:blank}} catch {return {form:blank}}}

export function Inquiry({shop}) {
  const {t} = useLocale(), key = 'qadam-inquiry-' + shop.id;
  const [state, setState] = useState(() => restore(key));
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const lock = useRef(false), confirmation = useRef(null);
  const form = state.form || blank;
  function persist(next) {sessionStorage.setItem(key, JSON.stringify(next)); setState(next)}
  function edit(field, value) {
    const next = {...state, form:{...form, [field]:value}};
    setState(next);
    try {sessionStorage.setItem(key, JSON.stringify(next))} catch { /* Submission will require durable retry storage. */ }
  }
  async function submit(event) {
    event.preventDefault(); if (lock.current) return;
    setError('');
    if (!state.pending && !validContact(form.contact)) {setError(t('Телефон немесе дұрыс email енгізіңіз.', 'Введите телефон или корректный email.')); return}
    lock.current = true; setBusy(true);
    try {
      const pending = state.pending || {client_request_id:crypto.randomUUID(), ...Object.fromEntries(Object.entries(form).map(([k,v]) => [k,v.trim()]))};
      // Persist BEFORE sending. Network failure/reload must repeat the exact payload and ID.
      const next = {...state, pending};
      try {persist(next)} catch {throw Object.assign(new Error('Storage unavailable'), {code:'STORAGE_UNAVAILABLE'})}
      const result = await publicApi(`/businesses/${shop.id}/inquiries`, pending);
      if (!result.id || !result.number) throw Error('Invalid confirmation');
      const done = {form:blank, result};
      setState(done);
      try {sessionStorage.setItem(key, JSON.stringify(done))} catch { /* Existing pending key still replays safely. */ }
      requestAnimationFrame(() => confirmation.current?.focus());
    } catch (err) {
      if (err.status === 422 || err.status === 404 || err.status === 429) {
        setState(current => {const next = {...current, pending:null}; try {sessionStorage.setItem(key, JSON.stringify(next))} catch {} return next});
      }
      setError(err.code === 'STORAGE_UNAVAILABLE' ? t('Браузер сақтауына рұқсат беріңіз. Өтінім жіберілмеді.', 'Разрешите хранение данных в браузере. Заявка не отправлена.') : err.status === 422 ? t('Өрістердің ұзындығы мен контактіні тексеріңіз.', 'Проверьте длину полей и контакт.') :
        err.status === 429 ? t('Сұрау көп. Бір минуттан кейін қайталаңыз.', 'Слишком много запросов. Повторите через минуту.') :
        t('Жауап алынбады. Мәтін сақталды. Сол өтінімді қайта жіберіңіз.', 'Ответ не получен. Текст сохранён. Повторите ту же заявку.'));
    } finally {lock.current = false; setBusy(false)}
  }
  if (state.result) return <section className="inquiry-success" tabIndex={-1} ref={confirmation} aria-live="polite">
    <span className="success-mark">✓</span><p className="eyebrow">{t('ӨТІНІМ САҚТАЛДЫ', 'ЗАЯВКА СОХРАНЕНА')}</p>
    <h2>{state.result.number}</h2><p>{shop.inquiry_mode === 'training' ? t('Оқу өтінімі серверде сақталды. Бұл нүктеде нақты сатушы жоқ.', 'Учебная заявка сохранена на сервере. У этой точки нет реального продавца.') : t('Өтінім сатушы кабинетіне түсті.', 'Заявка поступила в кабинет продавца.')}</p>
    <button type="button" onClick={() => {try {persist({form:blank})} catch {setError(t('Браузер сақтауына рұқсат беріңіз.', 'Разрешите хранение данных в браузере.'))}}}>{t('Жаңа өтінім', 'Новая заявка')}</button>{error && <p role="alert">{error}</p>}
  </section>;
  return <section className="inquiry-panel" id="inquiry"><p className="eyebrow">{t('САТУШЫҒА СҰРАҚ', 'ВОПРОС ПРОДАВЦУ')}</p>
    <h2>{t('Қажетіңізді сұраңыз', 'Спросите о нужном')}</h2><p>{t('Бағасын, түрін немесе шарттарын нақтылаңыз.', 'Уточните цену, варианты или условия.')}</p>
    {shop.inquiry_mode === 'training' && <p className="public-note">{t('Оқу нүктесі: өтінім сақталады, нақты сатушыға жіберілмейді. Жеке деректің орнына тест контактісін қолданыңыз.', 'Учебная точка: заявка сохраняется, но не отправляется реальному продавцу. Используйте тестовый контакт.')}</p>}
    <form onSubmit={submit} aria-busy={busy}>
      <fieldset disabled={busy || !!state.pending}>
        <label>{t('Атыңыз', 'Ваше имя')}<input name="visitor_name" required maxLength={100} autoComplete="name" value={form.visitor_name} onChange={e => edit('visitor_name', e.target.value)}/></label>
        <label>{t('Телефон немесе email', 'Телефон или email')}<input name="contact" required maxLength={200} autoComplete="off" value={form.contact} onChange={e => edit('contact', e.target.value)} aria-describedby="contact-privacy" placeholder="+7 700 000 00 00"/></label>
        <small id="contact-privacy">{t('Контакт ашық каталогта жарияланбайды.', 'Контакт не публикуется в открытом каталоге.')}</small>
        <label>{t('Сұрағыңыз', 'Ваш вопрос')}<textarea name="message" required maxLength={2000} rows={5} value={form.message} onChange={e => edit('message', e.target.value)}/></label>
        <small>{form.message.length} / 2000</small>
      </fieldset>
      {state.pending && !busy && <p className="public-note">{t('Қайталау бұрынғы мәтінмен орындалады: қосарланған өтінім жасалмайды.', 'Повтор отправит исходный текст: вторая заявка не создаётся.')}</p>}
      {error && <p className="public-error" role="alert">{error}</p>}
      <button className="primary-action" disabled={busy}>{busy ? t('Жіберілуде…', 'Отправляем…') : state.pending ? t('Сол өтінімді қайталау →', 'Повторить заявку →') : t('Өтінім жіберу →', 'Отправить заявку →')}</button>
      <p className="fine-print">{t('Бұл тапсырыс не төлем емес. Тауардың бар-жоғын сатушыдан нақтылаңыз.', 'Это не заказ и не оплата. Наличие товара уточняйте у продавца.')}</p>
    </form></section>;
}
