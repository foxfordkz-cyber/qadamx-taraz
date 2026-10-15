import React,{createContext,useContext,useEffect,useState} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {authApi,demo,setIdentity} from './api.js';
const AuthContext=createContext(null);
export const useAuth=()=>useContext(AuthContext);

function Login({onLogin,expired=false,loadError='',onRetry}){
 const [register,R]=useState(false),[email,E]=useState(''),[password,P]=useState(''),[business,B]=useState(''),[busy,S]=useState(false),[error,M]=useState('');
 return <div className="auth-screen"><section className="auth-story"><a className="brand" href="/"><span className="logo">q.</span> qadam<small>business</small></a><p className="eyebrow">КҮНДЕЛІКТІ САУДА — БІР ЖЕРДЕ</p><h1>Есепке аз уақыт.<br/>Саудаға көбірек көңіл.</h1><p>Сатылымды айтыңыз, тексеріңіз және растаңыз.<br/>Қарыз бен төлем есебін Qadam реттейді.</p><div className="auth-benefits"><p>✓ Әр дүкенге жеке кабинет</p><p>✓ Серверде сақталатын операциялар</p><p>✓ Қазақша және орысша дауыс енгізу</p></div></section><article className="auth-card"><span className="badge">Qadam Business</span><h1>{expired?'Қайта кіріңіз':register?'Дүкеніңізді тіркеңіз':'Қош келдіңіз'}</h1><p>{expired?'Сеанс аяқталды. Толтырылған жазба осы бетте сақталып тұр.':register?'Аккаунт пен дүкеніңіз бірден жасалады.':'Жалғастыру үшін аккаунтыңызға кіріңіз.'}</p>{loadError&&<div className="error" role="alert">{loadError}<button className="text-button" onClick={onRetry}>Қайта қосылу</button></div>}<form onSubmit={async e=>{e.preventDefault();if(busy)return;S(true);M('');try{const user=await authApi('/auth/'+(register?'register':'login'),{email,password,...register?{business_name:business}:{}});P('');onLogin(user)}catch(err){M(err.message||'Сервер қолжетімсіз. Backend іске қосылғанын тексеріңіз.')}finally{S(false)}}}>{register&&<label>Дүкен атауы<input required minLength={2} maxLength={120} value={business} onChange={e=>B(e.target.value)} autoComplete="organization"/></label>}<label>Email<input required type="email" maxLength={254} value={email} onChange={e=>E(e.target.value)} autoComplete="username" placeholder="you@example.com"/></label><label>Құпиясөз<input required type="password" minLength={10} maxLength={128} value={password} onChange={e=>P(e.target.value)} autoComplete={register?'new-password':'current-password'}/></label>{register&&<small>Кемінде 10 таңба. Email растауы мен құпиясөзді email арқылы қалпына келтіру әзірге қосылмаған.</small>}{error&&<p role="alert" className="error">{error}</p>}<button className="wide" disabled={busy}>{busy?'Күтіңіз…':register?'Аккаунт ашу →':'Жүйеге кіру →'}</button></form>{!expired&&<button className="text-button" disabled={busy} onClick={()=>{R(!register);M('')}}>{register?'Аккаунтым бар — кіру':'Аккаунт жоқ па? Тіркелу'}</button>}</article></div>
}

export function AuthProvider({children}){
 const client=useQueryClient(),[user,U]=useState(null),[loading,L]=useState(!demo),[expired,X]=useState(false),[error,E]=useState('');
 async function check(){L(true);E('');try{const result=await authApi('/me');setIdentity(result);U(result)}catch(err){if(err.status!==401)E('Серверге қосылу мүмкін болмады. Backend іске қосылғанын тексеріңіз.')}finally{L(false)}}
 useEffect(()=>{if(!demo)check();const expiredHandler=()=>X(true);window.addEventListener('qadam-auth-required',expiredHandler);return()=>window.removeEventListener('qadam-auth-required',expiredHandler)},[]);
 async function login(next){if(user&&user.id!==next.id)client.clear();setIdentity(next);U(next);X(false);try{const full=await authApi('/me');setIdentity(full);U(full)}catch{}await client.invalidateQueries()}
 async function logout(){await authApi('/auth/logout',{});setIdentity(null);U(null);X(false);client.clear()}
 if(demo)return <AuthContext.Provider value={{user:null,logout}}>{children}</AuthContext.Provider>;
 if(loading)return <div className="auth-loading">Qadam · Серверге қосылуда…</div>;
 if(!user)return <Login onLogin={login} loadError={error} onRetry={check}/>;
 return <AuthContext.Provider value={{user,logout}}><div key={user.id} inert={expired?true:undefined}>{children}</div>{expired&&<div className="auth-overlay" role="dialog" aria-modal="true" aria-label="Қайта кіру"><Login expired onLogin={login}/></div>}</AuthContext.Provider>;
}

export function Account(){const{user,logout}=useAuth();const[error,E]=useState(''),[busy,B]=useState(false);if(demo)return <span className="badge">● Оқу режимі</span>;return <div className="account"><span className="badge">● {user.business_name}</span><button disabled={busy} className="text-button" onClick={async()=>{B(true);try{await logout()}catch{E('Шығу орындалмады. Қайта көріңіз.')}finally{B(false)}}}>Шығу</button>{error&&<span role="alert">{error}</span>}</div>}
export function AIStatus(){const{user}=useAuth();if(demo||user?.ai_configured)return null;return <div className="demo-banner">Дауыс тану әзірге қолжетімсіз. Сатылым мен төлемді қолмен енгізуге болады.</div>}
