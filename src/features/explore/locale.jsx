import React, {createContext, useContext, useEffect, useState} from 'react';
const Context = createContext(null);
export function Locale({children}) {
  const [lang, setLang] = useState(() => {try {return localStorage.getItem('qadam-public-language') === 'ru' ? 'ru' : 'kk'} catch {return 'kk'}});
  useEffect(() => {document.documentElement.lang = lang; try {localStorage.setItem('qadam-public-language', lang)} catch {}}, [lang]);
  const t = (kk, ru) => lang === 'ru' ? ru : kk;
  return <Context.Provider value={{lang, setLang, t}}>{children}</Context.Provider>;
}
export const useLocale = () => useContext(Context);
export function Category({value}) {
  const {t} = useLocale();
  return {clothes:t('Киім', 'Одежда'), food:t('Азық-түлік', 'Продукты'), home:t('Үйге арналған', 'Для дома')}[value] || value;
}
