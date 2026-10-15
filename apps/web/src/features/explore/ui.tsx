import type { ReactNode } from 'react';
import { setLang, useT } from './i18n';

export function LangSwitch() {
  const { lang } = useT();
  return (
    <div className="lang" role="group" aria-label="Language">
      {(['ru', 'kk'] as const).map((l) => (
        <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)}>
          {l === 'ru' ? 'RU' : 'ҚАЗ'}
        </button>
      ))}
    </div>
  );
}

export function State({ loading, error, onRetry, children }: {
  loading: boolean; error: Error | null; onRetry: () => void; children: ReactNode;
}) {
  const { t } = useT();
  if (error)
    return (
      <div className="state" role="alert">
        <p>{t('load_error')}</p>
        <button type="button" className="btn" onClick={onRetry}>{t('retry')}</button>
      </div>
    );
  if (loading) return <p className="state" role="status" aria-busy="true">{t('loading')}</p>;
  return <>{children}</>;
}
