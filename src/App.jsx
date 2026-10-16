import React from 'react';
import {BrowserRouter,NavLink,Routes,Route,Navigate} from 'react-router-dom';
import {demo} from './api.js';
import {Sale} from './features/voice/Sale.jsx';
import {Debts,History,Customers} from './features/ledger/Ledger.jsx';
import {Summary} from './features/summary/Summary.jsx';
import {AuthProvider,Account,AIStatus} from './Auth.jsx';
import {PublicLayout,Home,Venue,Shop,NotFound} from './features/explore/Explore.jsx';
import {SellerInquiries} from './features/inquiry/SellerInquiries.jsx';
const links=[['inquiries','↗','Витрина / Өтінімдер'],['ai','✦','AI көмекшісі'],['sale','＋','Жаңа жазба'],['debts','◷','Қарыздар'],['history','≡','Операциялар'],['customers','♧','Клиенттер'],['summary','▥','Күн қорытындысы']];
function SellerApp(){return <><aside className="sidebar"><a className="brand" href="/"><span className="logo">q.</span> qadam<small>business</small></a><div className="shop"><span className="avatar">Q</span><div><strong>Менің дүкенім</strong><small>Сатушы кабинеті · Тараз</small></div></div><p className="nav-caption">КҮНДЕЛІКТІ ЕСЕП</p><nav>{links.map(([path,icon,label])=><NavLink key={path} to={'/seller/'+path}><span>{icon}</span>{label}</NavLink>)}</nav><div className="sidebar-note"><b>Әр сатылым — есепте.</b><p>Айтыңыз, тексеріңіз,<br/>содан кейін растаңыз.</p></div></aside><div className="workspace"><header><span>Саудаңызды оңай басқарыңыз</span><Account/></header><main><AIStatus/>{demo&&<div className="demo-banner">Оқу деректері осы браузерде сақталады. Нақты AI және сервер қосылмаған.</div>}<Routes><Route path="inquiries" element={<SellerInquiries/>}/><Route path="ai" element={<Sale aiMode/>}/><Route path="sale" element={<Sale/>}/><Route path="debts" element={<Debts/>}/><Route path="history" element={<History/>}/><Route path="customers" element={<Customers/>}/><Route path="summary" element={<Summary/>}/><Route path="*" element={<Navigate to="/seller/sale" replace/>}/></Routes></main><footer>Qadam Business <span>Сату. Төлем. Қарыз. Бір жерде.</span></footer></div></>}
export function QadamRoutes(){return <Routes><Route element={<PublicLayout/>}><Route index element={<Home/>}/><Route path="venues/:slug" element={<Venue/>}/><Route path="shops/:slug" element={<Shop/>}/><Route path="*" element={<NotFound/>}/></Route><Route path="/seller/*" element={<AuthProvider><SellerApp/></AuthProvider>}/></Routes>}
