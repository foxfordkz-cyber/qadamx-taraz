import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../../shared/api/client";
import { formatKZT } from "../../shared/format";
import { WhatsAppLink } from "../../shared/WhatsAppLink";
import { useLedgerCustomers } from "../ledger/customers";
import { useI18n, type TranslationKey } from "../../shared/i18n";
import { Alert, Button, Card, ErrorState, Spinner } from "../../shared/ui";
import { debtLink, type AssistantRequest } from "./model";
import { AssistantProvider, useAssistant } from "./state";
import "./assistant.css";

const suggestions: TranslationKey[] = [
  "assistantSuggestDebts",
  "assistantSuggestWeek",
  "assistantSuggestReminder",
  "assistantSuggestToday",
];
const destinations = {
  open_debts: "/seller/debts",
  new_sale: "/seller/sale",
  open_history: "/seller/history",
  open_analytics: "/seller/analytics",
};
const actionLabels = {
  open_debts: "analyticsOpenDebts",
  new_sale: "analyticsNewSale",
  open_history: "analyticsOpenHistory",
  open_analytics: "analyticsTitle",
} as const;

function Reminder({
  text,
  customerId,
}: {
  text: string;
  customerId?: string | null;
}) {
  const { t } = useI18n();
  const customers = useLedgerCustomers([customerId]);
  const contact = customerId
    ? customers.get(customerId.toLowerCase())?.contact
    : null;
  const [copy, setCopy] = useState<"idle" | "copied" | "failed">("idle");
  return (
    <div className="assistant-reminder">
      <h3>{t("assistantReminder")}</h3>
      <p>{text}</p>
      <div className="assistant-reminder-tools">
        <Button
          variant="secondary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              setCopy("copied");
            } catch {
              setCopy("failed");
            }
          }}
        >
          {t("assistantCopy")}
        </Button>
        <WhatsAppLink text={text} contact={contact} />
      </div>
      <span role="status">
        {copy === "copied"
          ? t("assistantCopied")
          : copy === "failed"
            ? t("assistantCopyFailed")
            : ""}
      </span>
      <small>{t("assistantCopyHint")}</small>
    </div>
  );
}

export function AssistantCard({
  summary = false,
  initialQuestion,
}: {
  summary?: boolean;
  initialQuestion?: string;
}) {
  const state = useAssistant();
  const { t, locale } = useI18n();
  const [question, setQuestion] = useState(initialQuestion ?? "");
  const started = useRef(false);
  const answerRef = useRef<HTMLElement>(null);
  const { ask, available } = state;
  useEffect(() => {
    let active = true;
    if (initialQuestion && available && !started.current) {
      // Let StrictMode's setup/cleanup finish before sending the user-requested
      // reminder. Otherwise the first mount aborts it and the second cannot retry.
      queueMicrotask(() => {
        if (!active) return;
        started.current = true;
        void ask(initialQuestion, true);
      });
    }
    return () => {
      active = false;
    };
  }, [initialQuestion, available, ask]);
  useEffect(() => {
    if (state.response && window.matchMedia?.("(max-width: 720px)").matches) {
      answerRef.current?.focus({ preventScroll: true });
      answerRef.current?.scrollIntoView({ block: "start" });
    }
  }, [state.response]);
  const id = useId();
  if (!state.available) return null;
  const limited = state.error instanceof ApiError && state.error.status === 429;
  const result = state.response;
  const empty = result?.facts.every(
    (fact) => (fact.value_minor ?? fact.count ?? 0) === 0,
  );
  const questions = (
    <>
      <form
        className="assistant-form"
        onSubmit={(event) => {
          event.preventDefault();
          void state.ask(question);
        }}
      >
        <label className="field" htmlFor={`${id}-question`}>
          <span id={`${id}-label`}>{t("assistantQuestion")}</span>
          <textarea
            id={`${id}-question`}
            aria-labelledby={`${id}-label`}
            rows={2}
            maxLength={500}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            aria-describedby={`${id}-limit`}
          />
          <small id={`${id}-limit`}>{Array.from(question).length}/500</small>
        </label>
        <Button
          type="submit"
          disabled={state.pending || limited || !question.trim()}
        >
          {t("assistantAsk")}
        </Button>
      </form>
      <div
        className="assistant-suggestions"
        role="group"
        aria-label={t("assistantSuggestions")}
      >
        {suggestions.map((key) => (
          <Button
            key={key}
            variant="secondary"
            disabled={state.pending || limited}
            onClick={() => {
              setQuestion(t(key));
              void state.ask(t(key));
            }}
          >
            {t(key)}
          </Button>
        ))}
      </div>
    </>
  );
  return (
    <Card className="assistant" aria-labelledby={`${id}-title`}>
      <div className="assistant-heading">
        <span className="assistant-mark" aria-hidden="true">
          ✦
        </span>
        <div>
          <h2 id={`${id}-title`}>
            {t(
              summary
                ? state.days === 7
                  ? "assistantWeekTitle"
                  : "assistantPeriodTitle"
                : "assistantTitle",
            )}
          </h2>
          <p>{t("assistantIntro")}</p>
        </div>
      </div>
      {state.demo && <Alert>{t("assistantDemo")}</Alert>}
      {summary && (
        <Button
          disabled={state.pending || limited}
          onClick={() => void state.ask(t("assistantSummaryQuestion"))}
        >
          {t("assistantExplain")}
        </Button>
      )}
      {summary ? (
        <details className="assistant-questions">
          <summary>{t("assistantOtherQuestion")}</summary>
          {questions}
        </details>
      ) : (
        questions
      )}
      {state.pending && <Spinner />}
      {limited ? (
        <Alert tone="error">{t("assistantLimit")}</Alert>
      ) : state.error ? (
        <ErrorState error={state.error} retry={() => void state.retry()} />
      ) : null}
      {result && (
        <section
          ref={answerRef}
          tabIndex={-1}
          className="assistant-result"
          aria-label={t("assistantAnswer")}
          aria-live="polite"
        >
          <p className="assistant-answer">{result.answer}</p>
          {empty && <p>{t("assistantEmpty")}</p>}
          {result.facts.length > 0 && (
            <details className="assistant-facts-details">
              <summary>{t("assistantFacts")}</summary>
              {result.facts.length ? (
                <dl className="assistant-facts">
                  {result.facts.map((fact, index) => (
                    <div key={`${fact.key}:${index}`}>
                      <dt>{fact.label}</dt>
                      <dd>
                        {fact.value_minor != null
                          ? formatKZT(fact.value_minor, locale)
                          : fact.count}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </details>
          )}
          <div className="assistant-actions">
            {result.actions.map((action, index) =>
              action.kind === "reminder_draft" ? (
                <Reminder
                  key={`${index}:${action.text}`}
                  text={action.text!}
                  customerId={action.customer_id}
                />
              ) : (
                <Link
                  className="button button-secondary"
                  key={`${action.kind}:${index}`}
                  to={
                    action.kind === "open_debts"
                      ? debtLink(action.customer_id)
                      : destinations[action.kind]
                  }
                >
                  {t(actionLabels[action.kind])}
                </Link>
              ),
            )}
          </div>
          <p className="assistant-source">
            {t(
              state.demo
                ? "assistantDemo"
                : result.source === "ai"
                  ? "assistantSourceAI"
                  : result.source === "facts"
                    ? "assistantSourceFacts"
                    : "assistantSourceFallback",
            )}
          </p>
          <small className="muted">
            {t("analyticsAsOf")}:{" "}
            <time dateTime={result.as_of}>
              {new Intl.DateTimeFormat("ru-KZ", {
                timeZone: result.timezone,
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              }).format(new Date(result.as_of))}
            </time>
          </small>
        </section>
      )}
    </Card>
  );
}

/** Standalone component for the cabinet panel owned by seller-web. */
export function Assistant({ days = 7 }: { days?: AssistantRequest["days"] }) {
  return (
    <AssistantProvider days={days}>
      <AssistantCard />
    </AssistantProvider>
  );
}

export function AssistantDebtors() {
  const { response, available, pending, demo } = useAssistant();
  const { t, locale } = useI18n();
  const id = useId();
  const debtors = response?.facts.filter((fact) => fact.key === "debtor") ?? [];
  return (
    <Card className="assistant-debtors" aria-labelledby={id}>
      <h2 id={id}>{t("assistantWhoToRemind")}</h2>
      {response ? (
        <>
          {demo && <p className="muted">{t("assistantDemo")}</p>}
          {debtors.length ? (
            <ul>
              {debtors.map((fact) => (
                <li key={fact.customer_id}>
                  <Link to={debtLink(demo ? null : fact.customer_id)}>
                    <span>{fact.label}</span>
                    <strong>{formatKZT(fact.value_minor!, locale)}</strong>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p>{t("assistantNoDebtors")}</p>
          )}
        </>
      ) : (
        <p className="muted">
          {t(
            available
              ? pending
                ? "loading"
                : "assistantDebtorsHint"
              : "assistantDebtorsOpen",
          )}
        </p>
      )}
      <Link className="button button-secondary" to="/seller/debts">
        {t("analyticsOpenDebts")}
      </Link>
    </Card>
  );
}
