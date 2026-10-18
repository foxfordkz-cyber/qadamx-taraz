import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "../../app/auth";
import { useBusiness, useRuntime } from "../../app/runtime";
import { ApiError } from "../../shared/api/client";
import { useI18n } from "../../shared/i18n";
import { assistantDemo } from "./demo";
import type { AnalyticsSnapshot } from "../seller/analytics/model";
import {
  readAssistantResponse,
  type AssistantRequest,
  type AssistantResponse,
} from "./model";

export function assistantEnabled() {
  return import.meta.env.VITE_ASSISTANT_ENABLED === "true";
}
function useAssistantSession(
  days: AssistantRequest["days"],
  autoSummary: boolean,
  demoSnapshot?: AnalyticsSnapshot,
) {
  const auth = useAuth();
  const { api } = useRuntime();
  const { business } = useBusiness();
  const { locale, t } = useI18n();
  const [response, setResponse] = useState<AssistantResponse>();
  const [error, setError] = useState<unknown>();
  const [pending, setPending] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [lastQuestion, setLastQuestion] = useState("");
  const [lastAi, setLastAi] = useState(true);
  const controller = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      controller.current?.abort();
      controller.current = null;
    },
    [],
  );
  const available =
    assistantEnabled() &&
    !disabled &&
    !auth.expired &&
    (auth.demo || !!auth.session);
  const ask = useCallback(
    async (question: string, ai = true) => {
      const trimmed = question.trim();
      if (
        !available ||
        controller.current ||
        !trimmed ||
        Array.from(trimmed).length > 500
      )
        return;
      const request: AssistantRequest = {
        question: trimmed,
        days,
        locale,
        ai,
      };
      const current = new AbortController();
      controller.current = current;
      setPending(true);
      setError(undefined);
      if (!autoSummary) setResponse(undefined);
      setLastQuestion(trimmed);
      setLastAi(ai);
      const timeout = setTimeout(() => {
        if (current.signal.aborted) return;
        current.abort();
        controller.current = null;
        setPending(false);
        setError(new ApiError(0, "NETWORK_ERROR"));
      }, 65_000);
      current.signal.addEventListener("abort", () => clearTimeout(timeout), {
        once: true,
      });
      try {
        const result = auth.demo
          ? assistantDemo(business.id, request, demoSnapshot)
          : readAssistantResponse(
              await api.request(`/businesses/${business.id}/assistant`, {
                method: "POST",
                body: JSON.stringify(request),
                signal: current.signal,
              }),
              { businessId: business.id, days, locale },
            );
        if (!current.signal.aborted) setResponse(result);
      } catch (failure) {
        if (!current.signal.aborted) {
          if (
            failure instanceof ApiError &&
            failure.code === "ASSISTANT_DISABLED"
          )
            setDisabled(true);
          else setError(failure);
        }
      } finally {
        clearTimeout(timeout);
        if (!current.signal.aborted) {
          setPending(false);
          controller.current = null;
        }
      }
    },
    [
      available,
      days,
      locale,
      autoSummary,
      auth.demo,
      business.id,
      api,
      demoSnapshot,
    ],
  );
  const summaryQuestion = t("assistantSummaryQuestion");
  useEffect(() => {
    if (autoSummary) void ask(summaryQuestion, false);
  }, [autoSummary, ask, summaryQuestion]);
  return {
    response,
    error,
    pending,
    available,
    demo: auth.demo,
    days,
    ask,
    lastQuestion,
    retry: () => ask(lastQuestion, lastAi),
    disable: () => setDisabled(true),
  };
}
const AssistantContext = createContext<ReturnType<
  typeof useAssistantSession
> | null>(null);
function Session({
  days,
  children,
  autoSummary,
  demoSnapshot,
}: {
  days: AssistantRequest["days"];
  children: ReactNode;
  autoSummary: boolean;
  demoSnapshot?: AnalyticsSnapshot;
}) {
  const state = useAssistantSession(days, autoSummary, demoSnapshot);
  return (
    <AssistantContext.Provider value={state}>
      {children}
    </AssistantContext.Provider>
  );
}
/** Remount synchronously on identity, membership, period or language changes. */
export function AssistantProvider({
  days = 7,
  children,
  autoSummary = false,
  demoSnapshot,
}: {
  days?: AssistantRequest["days"];
  children: ReactNode;
  autoSummary?: boolean;
  demoSnapshot?: AnalyticsSnapshot;
}) {
  const { scope } = useRuntime();
  const { business } = useBusiness();
  const { locale } = useI18n();
  const { expired, demo } = useAuth();
  return (
    <Session
      key={`${scope}:${business.id}:${days}:${locale}:${expired}:${demo}`}
      days={days}
      autoSummary={autoSummary}
      demoSnapshot={demoSnapshot}
    >
      {children}
    </Session>
  );
}
export function useAssistant() {
  const value = useContext(AssistantContext);
  if (!value) throw new Error("AssistantProvider required");
  return value;
}
