import { LanguageSwitch, useI18n } from "../shared/i18n";
import { Alert, Button } from "../shared/ui";

export function AuthRecovery() {
  const { t } = useI18n();
  return (
    <main className="standalone-state" id="main-content">
      <LanguageSwitch />
      <Alert tone="error">
        {t(navigator.onLine ? "authRestoreUnavailable" : "authOffline")}
      </Alert>
      <p>{t("authRestoreHint")}</p>
      <Button onClick={() => window.location.reload()}>{t("retry")}</Button>
    </main>
  );
}
