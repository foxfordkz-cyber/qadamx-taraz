import React from 'react';
import {useQuery} from '@tanstack/react-query';
import {fetchList} from './api.js';
export const useList = (key,path) => useQuery({queryKey:[key],queryFn:()=>fetchList(path)});
export function QueryState({query}) {return query.isPending?<p className="empty">Жүктелуде…</p>:query.error?<div role="alert" className="error">{query.error.message} <button className="secondary" onClick={()=>query.refetch()}>Қайта жүктеу</button></div>:null;}
export function Title({title,children}) {return <div className="page-title"><p className="eyebrow">САТУШЫ КАБИНЕТІ</p><h1>{title}</h1><p>{children}</p></div>}
