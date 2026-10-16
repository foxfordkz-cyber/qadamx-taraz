import React, {useEffect} from 'react';
import {Link, Outlet, useLocation, useParams, useSearchParams} from 'react-router-dom';
import {useQuery} from '@tanstack/react-query';
import {Locale, Category, useLocale} from './locale.jsx';
import {publicApi, publicList, shopHref, venueHref} from './publicApi.js';
import {Scene} from './Scene.jsx';
import {Inquiry} from '../inquiry/Inquiry.jsx';
import './explore.css';

export function PublicLayout() {return <Locale><Layout/></Locale>}
function Layout() {
  const {lang,setLang,t} = useLocale(), location = useLocation();
  useEffect(() => {if(location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView(); else window.scrollTo?.({top:0,behavior:'instant'})}, [location.pathname,location.hash]);
  return <div className="public-app"><a className="skip-link" href="#public-main">{t('Мазмұнға өту', 'К содержимому')}</a>
    <header className="public-header"><Link className="public-brand" to="/">qadam<span>ТАРАЗ</span></Link><nav aria-label={t('Негізгі мәзір', 'Основное меню')}><Link to="/#venues">{t('Алаңдар', 'Площадки')}</Link><Link to="/seller/ai" className="seller-link">{t('Сатушы кабинеті', 'Кабинет продавца')} ↗</Link><div className="language-switch" aria-label={t('Тіл', 'Язык')}><button aria-pressed={lang==='kk'} onClick={() => setLang('kk')}>KZ</button><button aria-pressed={lang==='ru'} onClick={() => setLang('ru')}>RU</button></div></nav></header>
    <main id="public-main" className="public-main"><Outlet/></main>
    <footer className="public-footer"><Link className="public-brand" to="/">qadam<span>ТАРАЗ</span></Link><p>{t('Қалаңыздағы саудаға бір қадам жақын.', 'На шаг ближе к торговле вашего города.')}</p><span>{t('Оқу витринасы · шартты геометрия', 'Учебная витрина · условная геометрия')}</span></footer>
  </div>;
}
function useVenues() {return useQuery({queryKey:['public-venues'],queryFn:() => publicList('/venues'),staleTime:60000})}
export function ApiState({query}) {
  const {t} = useLocale();
  return query.isError ? <div className="public-error" role="alert"><p>{t('Деректер жүктелмеді. Сервер байланысын тексеріңіз.', 'Не удалось загрузить данные. Проверьте соединение с сервером.')}</p><button onClick={() => query.refetch()}>{t('Қайта көру', 'Повторить')}</button></div> : <p className="loading-line" role="status">{t('Жүктелуде…', 'Загрузка…')}</p>;
}
const summaries = {
  mart:['Қала ырғағындағы сауда', 'Покупки в ритме города'],
  kaikarmet:['Күнделікті керек-жарақ', 'Всё для повседневного'],
  'auyl-bereke':['Базардың ерекше әлемі', 'Особый мир базара'],
};
export function Home() {
  const {t} = useLocale(), query = useVenues();
  return <>
    <section className="public-hero"><div className="hero-copy"><p className="eyebrow"><span className="live-dot"/> {t('ТАРАЗДЫ ЖАҢАША АШЫҢЫЗ', 'ОТКРОЙТЕ ТАРАЗ ПО-НОВОМУ')}</p><h1>{t('Өз қалаңыз.', 'Ваш город.')}<br/>{t('Өз дүкеніңіз.', 'Ваш магазин.')}<br/><em>{t('Бір қадам.', 'Один шаг.')}</em></h1><p className="hero-lead">{t('Алаңды таңдаңыз, дүкенді табыңыз, сатушыдан сұраңыз. Qadam — жергілікті саудаға қарапайым жол.', 'Выберите площадку, найдите магазин, задайте вопрос продавцу. Qadam — простой путь к местной торговле.')}</p><div className="hero-actions"><a className="primary-action" href="#venues">{t('Дүкен табу', 'Найти магазин')} ↗</a><Link className="secondary-action" to="/seller/ai">{t('Сатушы кабинеті', 'Кабинет продавца')} →</Link></div><p className="hero-footnote">{t('3 алаң · оқу каталогы · тіркелусіз өтінім', '3 площадки · учебный каталог · заявка без регистрации')}</p></div><div className="hero-scene">{query.data ? <Scene venues={query.data}/> : <ApiState query={query}/>}</div></section>
    <section id="venues" className="venues-section"><div className="section-title"><div><p className="eyebrow">01 / {t('ҚАЙДАН БАСТАЙМЫЗ?', 'С ЧЕГО НАЧНЁМ?')}</p><h2>{t('Үш алаң. Бір қала.', 'Три площадки. Один город.')}</h2></div><p>{t('Сахнадан немесе карточкадан таңдаңыз.', 'Выберите в сцене или на карточке.')}</p></div>
      {query.data ? <div className="venue-grid">{query.data.map((venue,index) => <Link className={'venue-card venue-'+venue.slug} to={venueHref(venue)} key={venue.id}><div className="venue-image"><span className="venue-index">0{index+1}</span><img src={`/previews/${venue.slug}.webp`} alt={t(`${venue.name} шартты моделі`, `Условная модель ${venue.name}`)} loading="lazy" width="640" height="400"/><span className="venue-arrow">↗</span></div><div className="venue-info"><span className="eyebrow">{t('ТАРАЗ · ОҚУ АЛАҢЫ', 'ТАРАЗ · УЧЕБНАЯ ПЛОЩАДКА')}</span><h3>{venue.name}</h3><p>{t(...(summaries[venue.slug] || ['Дүкендер', 'Магазины']))}</p></div></Link>)}</div> : <ApiState query={query}/>}
    </section>
    <section className="how-section"><div><p className="eyebrow">02 / {t('БӘРІ ҚАРАПАЙЫМ', 'ВСЁ ПРОСТО')}</p><h2>{t('Іздеуден сұраққа дейін.', 'От поиска до вопроса.')}</h2><p>{t('Каталогты ашу үшін тіркелу қажет емес.', 'Чтобы открыть каталог, регистрация не нужна.')}</p></div><ol>{[[t('Алаңды таңдаңыз','Выберите площадку'),t('Үш кеңістіктің бірін ашыңыз.','Откройте одно из трёх пространств.')],[t('Дүкенді табыңыз','Найдите магазин'),t('Іздеу мен санаттар көмектеседі.','Используйте поиск и категории.')],[t('Өтінім қалдырыңыз','Оставьте заявку'),t('Сұрағыңыз бен кері байланыс контактісін жазыңыз.','Укажите вопрос и контакт для связи.')]].map(([title,desc],i) => <li key={title}><span>0{i+1}</span><div><h3>{title}</h3><p>{desc}</p></div></li>)}</ol></section>
    <p className="public-disclosure">{t('Бұл — оқу жобасы. Нүктелер мен каталог оқу мақсатында берілген. 3D — өлшемдері болжамды шартты схема; нақты ішкі бағытты немесе алаңмен серіктестікті білдірмейді.', 'Это учебный проект. Точки и каталог представлены для обучения. 3D — концептуальная схема с оценочными размерами; она не обозначает реальную внутреннюю навигацию или партнёрство с площадками.')}</p>
  </>;
}
function ShopCard({shop,index}) {
  const {t} = useLocale();
  return <Link className="public-shop-card" to={shopHref(shop)}><div className={'category-art art-'+shop.category}><span>{shop.category === 'clothes' ? '♧' : shop.category === 'food' ? '◉' : '⌂'}</span><small>{String(index+1).padStart(2,'0')}</small></div><div><span className="shop-category"><Category value={shop.category}/></span><h3>{shop.name}</h3><p>{shop.is_demo ? t('Оқу нүктесі', 'Учебная точка') : shop.description}</p><span className="shop-cta">{t('Каталог және өтінім', 'Каталог и заявка')} ↗</span></div></Link>;
}
export function Venue() {
  const {slug} = useParams(), {t} = useLocale(), venues = useVenues(), [params,setParams] = useSearchParams();
  const venue = venues.data?.find(v => v.slug === slug), q = params.get('q') || '', category = params.get('category') || '';
  const shops = useQuery({queryKey:['public-shops',venue?.id,q,category],enabled:!!venue,queryFn:() => publicList('/businesses?'+new URLSearchParams({venue_id:venue.id,q,category}))});
  function filter(key,value) {const next = new URLSearchParams(params); value ? next.set(key,value) : next.delete(key); setParams(next,{replace:true})}
  if (!venues.data) return <ApiState query={venues}/>;
  if (!venue) return <NotFound/>;
  return <><div className="breadcrumbs"><Link to="/">{t('Басты бет', 'Главная')}</Link><span>/</span>{venue.name}</div><section className="venue-heading"><div><p className="eyebrow">{t('АЛАҢДЫ ЗЕРТТЕҢІЗ', 'ИССЛЕДУЙТЕ ПЛОЩАДКУ')}</p><h1>{venue.name}</h1><p>{t(...summaries[slug])}</p></div><span className="concept-badge">◇ {t('Шартты схема · оқу нүктелері', 'Концептуальная схема · учебные точки')}</span></section>
    <Scene key={venue.id} venues={venues.data} venue={venue} shops={shops.data || []}/>
    <section className="shop-directory" aria-labelledby="shops-title"><div className="section-title"><div><p className="eyebrow">{t('КАТАЛОГ', 'КАТАЛОГ')}</p><h2 id="shops-title">{t('Дүкендер', 'Магазины')}</h2></div><a href="#shop-list">{t('Тізімге өту', 'Перейти к списку')} ↓</a></div>
      <div className="directory-tools"><label className="search-label"><span>{t('Дүкен іздеу', 'Поиск магазина')}</span><input type="search" maxLength={120} value={q} placeholder={t('Атауы немесе сипаттамасы…', 'Название или описание…')} onChange={e => filter('q',e.target.value)}/></label><div className="category-filters" role="group" aria-label={t('Санаттар', 'Категории')}>{['','clothes','food','home'].map(c => <button key={c} aria-pressed={category===c} onClick={() => filter('category',c)}>{c ? <Category value={c}/> : t('Барлығы', 'Все')}</button>)}</div></div>
      <div id="shop-list" aria-live="polite">{shops.data ? shops.data.length ? <div className="public-shop-grid">{shops.data.map((shop,index) => <ShopCard key={shop.id} shop={shop} index={index}/>)}</div> : <div className="public-empty"><h3>{t('Ештеңе табылмады', 'Ничего не найдено')}</h3><button onClick={() => setParams({})}>{t('Сүзгілерді тазалау', 'Сбросить фильтры')}</button></div> : <ApiState query={shops}/>}</div>
    </section></>;
}
export function Shop() {
  const {slug} = useParams(), {t,lang} = useLocale(), venues = useVenues();
  const query = useQuery({queryKey:['public-shop',slug],queryFn:() => publicApi('/businesses/'+encodeURIComponent(slug))});
  if (query.error?.status === 404) return <NotFound/>;
  if (!query.data) return <ApiState query={query}/>;
  const shop = query.data, venue = venues.data?.find(v => v.id === shop.venue_id);
  return <><div className="breadcrumbs"><Link to="/">{t('Басты бет','Главная')}</Link><span>/</span>{venue && <><Link to={venueHref(venue)}>{venue.name}</Link><span>/</span></>}{shop.name}</div>
    <div className="shop-detail"><div className="shop-story"><p className="eyebrow"><Category value={shop.category}/> · {t('ОҚУ НҮКТЕСІ', 'УЧЕБНАЯ ТОЧКА')}</p><h1>{shop.name}</h1><p className="shop-description">{shop.is_demo && shop.inquiry_mode === 'training' ? t('Каталог пен өтінім жолын тексеруге арналған оқу дүкені. Алаңның расталған серіктесі емес.', 'Учебный магазин для знакомства с каталогом и заявками. Не подтверждённый партнёр площадки.') : shop.description}</p>
      <a className="primary-action mobile-inquiry-link" href="#inquiry">{t('Өтінімге өту', 'Перейти к заявке')} ↓</a>
      {venue && <Scene key={shop.id} venues={venues.data} venue={venue} shops={[shop]} selected={shop.slug}/>}
      <div className="section-title"><h2>{t('Оқу каталогы', 'Учебный каталог')}</h2><span className="concept-badge">{t('Нақты қор емес', 'Не реальный склад')}</span></div>
      {shop.catalog_items?.length ? <div className="catalog-items">{shop.catalog_items.map(item => <div className="catalog-item" key={item.id}><div className={'product-symbol art-'+shop.category}>{shop.category === 'home' ? '⌂' : '◇'}</div><div><h3>{item.is_demo ? t('Оқу тауары', 'Учебный товар') : item.name}</h3><p>{t('Бар-жоғын нақтылаңыз', 'Наличие уточняйте')}</p></div><strong>{item.price_minor == null ? t('Нақтылау', 'Уточнить') : new Intl.NumberFormat(lang==='kk'?'kk-KZ':'ru-KZ',{style:'currency',currency:'KZT',maximumFractionDigits:2}).format(item.price_minor/100)}</strong></div>)}</div> : <p className="public-note">{t('Каталог әлі толтырылмаған. Тауар туралы өтінімде сұраңыз.', 'Каталог пока не заполнен. Спросите о товаре в заявке.')}</p>}
    </div><Inquiry key={shop.id} shop={shop}/></div></>;
}
export function NotFound() {const {t} = useLocale();return <div className="public-empty"><p className="eyebrow">404</p><h1>{t('Бет табылмады', 'Страница не найдена')}</h1><Link className="primary-action" to="/">{t('Алаңдарға оралу', 'Вернуться к площадкам')} →</Link></div>}
