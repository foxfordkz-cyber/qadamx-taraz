import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { ru } from './ru';
import { kk } from './kk';
export type Locale = 'ru' | 'kk';
export type TranslationKey = keyof typeof ru;
const I18nContext = createContext<{ locale: Locale; setLocale: (value: Locale) => void; t: (key: TranslationKey) => string } | null>(null);
export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => {
    try { return localStorage.getItem('qadam.locale') === 'kk' ? 'kk' : 'ru'; } catch { return 'ru'; }
  });
  useEffect(() => {
    document.documentElement.lang = locale;
    try { localStorage.setItem('qadam.locale', locale); } catch { /* Language still works in memory. */ }
  }, [locale]);
  return <I18nContext.Provider value={{ locale, setLocale, t: key => (locale === 'kk' ? kk : ru)[key] }}>{children}</I18nContext.Provider>;
}
export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error('I18nProvider required');
  return value;
}
export function LanguageSwitch() {
  const { locale, setLocale, t } = useI18n();
  return <div className="language-switch" role="group" aria-label={t('language')}>
    <button type="button" aria-pressed={locale === 'ru'} onClick={() => setLocale('ru')}>RU</button>
    <button type="button" aria-pressed={locale === 'kk'} onClick={() => setLocale('kk')}>KZ</button>
  </div>;
}
