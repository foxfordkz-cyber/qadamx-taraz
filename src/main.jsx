import React from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter,NavLink,Routes,Route,Navigate} from 'react-router-dom';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {demo} from './api.js';
import {Sale} from './features/voice/Sale.jsx';
import {Debts,History,Customers} from './features/ledger/Ledger.jsx';
import {Summary} from './features/summary/Summary.jsx';
import './style.css';
import {AuthProvider,Account,AIStatus} from './Auth.jsx';
const links=[['sale','＋','Жаңа жазба'],['debts','◷','Қарыздар'],['history','≡','Операциялар'],['customers','♧','Клиенттер'],['summary','▥','Күн қорытындысы']];
function App(){return <BrowserRouter><aside className="sidebar"><a className="brand" href="/seller/sale"><span className="logo">q.</span> qadam<small>business</small></a><div className="shop"><span className="avatar">Q</span><div><strong>Менің дүкенім</strong><small>Сатушы кабинеті · Тараз</small></div></div><p className="nav-caption">КҮНДЕЛІКТІ ЕСЕП</p><nav>{links.map(([path,icon,label])=><NavLink key={path} to={'/seller/'+path}><span>{icon}</span>{label}</NavLink>)}</nav><div className="sidebar-note"><b>Әр сатылым — есепте.</b><p>Айтыңыз, тексеріңіз,<br/>содан кейін растаңыз.</p></div></aside><div className="workspace"><header><span>Саудаңызды оңай басқарыңыз</span><Account/></header><main><AIStatus/>{demo&&<div className="demo-banner">Оқу деректері осы браузерде сақталады. Нақты AI және сервер қосылмаған.</div>}<Routes><Route path="/seller/sale" element={<Sale/>}/><Route path="/seller/debts" element={<Debts/>}/><Route path="/seller/history" element={<History/>}/><Route path="/seller/customers" element={<Customers/>}/><Route path="/seller/summary" element={<Summary/>}/><Route path="*" element={<Navigate to="/seller/sale" replace/>}/></Routes></main><footer>Qadam Business <span>Сату. Төлем. Қарыз. Бір жерде.</span></footer></div></BrowserRouter>}
createRoot(document.getElementById('root')).render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:1}}})}><AuthProvider><App/></AuthProvider></QueryClientProvider>);
