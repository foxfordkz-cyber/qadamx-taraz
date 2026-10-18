import { useEffect } from "react";
import { useBusiness } from "../../app/runtime";
import { LanguageSwitch, useI18n } from "../../shared/i18n";
import { Button, Dialog } from "../../shared/ui";
import type { AnalyticsSnapshot } from "../seller/analytics/model";
import { AssistantCard } from "./Assistant";
import { AssistantProvider, useAssistant } from "./state";

function PanelContent({
  initialQuestion,
  onUnavailable,
}: {
  initialQuestion?: string;
  onUnavailable: () => void;
}) {
  const { available } = useAssistant();
  useEffect(() => {
    if (!available) onUnavailable();
  }, [available, onUnavailable]);
  return <AssistantCard initialQuestion={initialQuestion} />;
}

/** Uses the same dialog and assistant card as the cabinet; no chat lives on analytics. */
export function AssistantPanel({
  days,
  demoSnapshot,
  initialQuestion,
  onClose,
  onUnavailable,
}: {
  days: 7 | 30;
  demoSnapshot?: AnalyticsSnapshot;
  initialQuestion?: string;
  onClose: () => void;
  onUnavailable: () => void;
}) {
  const { t } = useI18n();
  const { business } = useBusiness();
  return (
    <Dialog
      title={t("assistantTitle")}
      open
      onClose={onClose}
      className="assistant-panel"
    >
      <div className="assistant-panel-context">
        <span>{business.name}</span>
        <LanguageSwitch />
      </div>
      <AssistantProvider days={days} demoSnapshot={demoSnapshot}>
        <PanelContent
          initialQuestion={initialQuestion}
          onUnavailable={onUnavailable}
        />
      </AssistantProvider>
      <Button variant="secondary" onClick={onClose}>
        {t("close")}
      </Button>
    </Dialog>
  );
}
