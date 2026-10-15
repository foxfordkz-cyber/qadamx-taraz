import { Component, StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { App } from './app/App';
import { AuthProvider } from './app/auth';
import { makeQueryClient } from './app/query';
import { I18nProvider, useI18n } from './shared/i18n';
import { Button, ErrorState } from './shared/ui';
import './shared/styles.css';
function FatalError() {
  const { t } = useI18n();
  return <div className="standalone-state"><ErrorState error={new Error('Render failed')} /><Button onClick={() => window.location.reload()}>{t('retry')}</Button></div>;
}
class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <FatalError /> : this.props.children; }
}
const queryClient = makeQueryClient();
createRoot(document.getElementById('root')!).render(<StrictMode><I18nProvider><ErrorBoundary><QueryClientProvider client={queryClient}><AuthProvider><BrowserRouter><App /></BrowserRouter></AuthProvider></QueryClientProvider></ErrorBoundary></I18nProvider></StrictMode>);
