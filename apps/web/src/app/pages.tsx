import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './auth';
import { useBusiness } from './runtime';
import { LanguageSwitch, useI18n, type TranslationKey } from '../shared/i18n';
import { Alert, Badge, Button, Card, EmptyState, Input, PageHeader, Spinner } from '../shared/ui';
import { Icon, type IconName } from '../shared/ui/Icon';

export const mainActions: { path: string; label: TranslationKey; hint: TranslationKey; icon: IconName }[] = [
  { path: 'sale', label: 'sale', hint: 'saleHint', icon: 'sale' },
  { path: 'debts', label: 'debts', hint: 'debtsHint', icon: 'debts' },
  { path: 'inquiries', label: 'inquiries', hint: 'inquiriesHint', icon: 'inquiries' },
  { path: 'summary', label: 'summary', hint: 'summaryHint', icon: 'summary' },
];
export function LoginPage() {
  const { t } = useI18n(); const auth = useAuth(); const navigate = useNavigate();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [show, setShow] = useState(false);
  const [pending, setPending] = useState(false); const [error, setError] = useState(false);
  if (auth.loading) return <Spinner />;
  if ((auth.session || auth.demo) && !auth.expired) return <Navigate to="/seller" replace />;
  return <div className="login-page">
    <header className="login-header"><Link className="brand" to="/"><span className="brand-mark">q.</span><span>qadam<span className="brand-business">business</span></span></Link><LanguageSwitch /></header>
    <main className="login-grid" id="main-content">
      <section className="login-intro"><p className="eyebrow">QADAM BUSINESS</p><h1>{t('welcome')}</h1><p>{t('cabinet')}</p><div className="brand-art" aria-hidden="true"><span>q.</span><div /><div /><div /></div></section>
      <Card className="login-card"><h2>{t('login')}</h2><p className="muted">{t('loginHint')}</p>
        {!auth.configured && <Alert>{t('authUnavailable')}</Alert>}
        {auth.expired && <Alert tone="error">{t('unauthorized')}</Alert>}
        <form className="form-stack" onSubmit={async event => {
          event.preventDefault(); if (!auth.configured || pending) return;
          setPending(true); setError(false);
          try { await auth.signIn(email.trim(), password); setPassword(''); navigate('/seller', { replace: true }); }
          catch { setError(true); } finally { setPending(false); }
        }}>
          <Input label={t('email')} type="email" required autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} />
          <Input label={t('password')} type={show ? 'text' : 'password'} required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} />
          <label className="checkbox-field"><input type="checkbox" checked={show} onChange={e => setShow(e.target.checked)} />{t('passwordShow')}</label>
          {error && <Alert tone="error">{t('authError')}</Alert>}
          <Button type="submit" disabled={!auth.configured || pending}>{t(pending ? 'loading' : 'login')}</Button>
        </form>
        <div className="login-demo"><Button variant="secondary" onClick={() => { auth.enterDemo(); navigate('/seller'); }}>{t('demoOpen')} <span aria-hidden="true">→</span></Button><small>{t('demoHint')}</small></div>
      </Card>
    </main><footer className="login-footer">Qadam Business · Taraz</footer>
  </div>;
}
export function DashboardPage() {
  const { t } = useI18n(); const { business } = useBusiness();
  return <>
    <div className="welcome-panel"><div><p className="eyebrow">{t('cabinet')}</p><h1>{t('dashboardTitle')}</h1><p>{t('dashboardHint')}</p><span className="welcome-business">{business.name} {business.is_demo && <Badge>{t('demo')}</Badge>}</span></div><span className="welcome-mark" aria-hidden="true">q.</span></div>
    <PageHeader title={t('tools')} />
    <div className="action-grid">{mainActions.map((action, index) => <Link key={action.path} className={`action-card action-${index}`} to={`/seller/${action.path}`}><span className="action-icon"><Icon name={action.icon} /></span><h2>{t(action.label)}</h2><p>{t(action.hint)}</p><span className="action-arrow"><Icon name="arrow" /></span></Link>)}</div>
    <div className="secondary-grid">{(['customers', 'catalog', 'history'] as const).map(key => <Link to={`/seller/${key}`} className="secondary-card" key={key}><Icon name={key} /><span>{t(key)}</span><span aria-hidden="true">↗</span></Link>)}</div>
    <p className="dashboard-note">Qadam Business · {t('cabinet')}</p>
  </>;
}
export function PendingModule({ label }: { label: TranslationKey }) {
  const { t } = useI18n();
  return <><PageHeader title={t(label)} /><Card><EmptyState title={t('moduleTitle')} description={t('moduleHint')} action={<Link className="button button-secondary" to="/seller">{t('back')}</Link>} /></Card></>;
}
export function PublicPending() {
  const { t } = useI18n();
  return <div className="public-page"><header><Link className="brand" to="/">Qadam Business</Link><LanguageSwitch /></header><main id="main-content"><PageHeader title={t('storefront')} /><EmptyState title={t('moduleTitle')} description={t('moduleHint')} action={<Link className="button button-primary" to="/login">{t('login')}</Link>} /></main></div>;
}
