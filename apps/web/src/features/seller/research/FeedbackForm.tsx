import { useEffect, useRef, useState, type FormEvent } from "react";
import { ApiError, type ApiClient } from "../../../shared/api/client";
import type { components } from "../../../shared/api/generated";
import { Alert, Button, Input, Select } from "../../../shared/ui";
import { useResearchText } from "./i18n";

export type Feedback = components["schemas"]["FeedbackCreate"];
const features: Feedback["features_used"] = [
  "sales",
  "debts",
  "voice",
  "analytics",
  "forecast",
  "risk",
  "catalog",
  "inquiries",
];
export function validFeedback(payload: Feedback) {
  return (
    payload.consent === true &&
    [...payload.improve_first.trim()].length >= 1 &&
    [...payload.improve_first.trim()].length <= 500 &&
    [...(payload.suggestion ?? "").trim()].length <= 2000 &&
    [...(payload.unresolved_problem ?? "").trim()].length <= 1500
  );
}

export function FeedbackForm({
  api,
  businessId,
  enabled,
}: {
  api: ApiClient;
  businessId: string;
  enabled: boolean;
}) {
  const { locale, r } = useResearchText();
  const [used, setUsed] = useState<Feedback["features_used"]>([]);
  const [clarity, setClarity] = useState("");
  const [usefulness, setUsefulness] = useState("");
  const [risk, setRisk] = useState("");
  const [priority, setPriority] = useState("");
  const [problem, setProblem] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [consent, setConsent] = useState(false);
  const [followUp, setFollowUp] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "saving" | "saved" | "invalid" | "unknown" | "rejected"
  >("idle");
  const [receipt, setReceipt] = useState("");
  const intent = useRef<Feedback | null>(null);
  const busy = useRef(false);
  const active = useRef(true);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      controller.current?.abort();
    };
  }, []);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!enabled || busy.current || status === "saved") return;
    const payload =
      intent.current ??
      ({
        client_request_id: crypto.randomUUID(),
        language: locale,
        consent,
        consent_version: "v1",
        features_used: used,
        sales_debt_clarity: clarity ? Number(clarity) : null,
        forecast_usefulness: usefulness ? Number(usefulness) : null,
        risk_clarity: risk ? Number(risk) : null,
        improve_first: priority.trim(),
        unresolved_problem: problem.trim(),
        suggestion: suggestion.trim(),
        follow_up: followUp,
      } satisfies Feedback);
    if (!validFeedback(payload)) {
      setStatus("invalid");
      return;
    }
    intent.current = payload;
    busy.current = true;
    setStatus("saving");
    const request = new AbortController();
    controller.current = request;
    const timeout = setTimeout(() => request.abort(), 20000);
    try {
      const response = await api.request(
        `/businesses/${businessId}/research/feedback`,
        {
          method: "POST",
          body: JSON.stringify(payload),
          signal: request.signal,
        },
      );
      if (!active.current) return;
      if (request.signal.aborted) throw new ApiError(0, "TIMEOUT");
      if (
        !response ||
        typeof response !== "object" ||
        !("id" in response) ||
        !("client_request_id" in response) ||
        response.client_request_id !== payload.client_request_id ||
        typeof response.id !== "string" ||
        !/^[0-9a-f-]{36}$/i.test(response.id)
      )
        throw new ApiError(0, "INVALID_RESPONSE");
      setReceipt(response.id);
      setStatus("saved");
    } catch (error) {
      if (!active.current) return;
      if (
        error instanceof ApiError &&
        error.status >= 400 &&
        error.status < 500 &&
        error.status !== 409
      ) {
        intent.current = null;
        setStatus("rejected");
      } else setStatus("unknown");
    } finally {
      clearTimeout(timeout);
      busy.current = false;
    }
  }
  const ratingOptions = (
    <>
      <option value="">{r("notRated")}</option>
      {[1, 2, 3, 4, 5].map((n) => (
        <option key={n} value={n}>
          {n}
        </option>
      ))}
    </>
  );
  const locked =
    status === "saving" || status === "unknown" || status === "saved";
  return (
    <form onSubmit={(e) => void submit(e)} noValidate>
      <p>{r("privacy")}</p>
      {!enabled && <Alert>{r("demoFeedback")}</Alert>}
      <fieldset disabled={locked || !enabled} className="research-fields">
        <legend>{r("feedback")}</legend>
        <fieldset className="research-checks">
          <legend>{r("features")}</legend>
          {features.map((feature) => (
            <label key={feature}>
              <input
                type="checkbox"
                checked={used.includes(feature)}
                onChange={(e) =>
                  setUsed(
                    e.target.checked
                      ? [...used, feature]
                      : used.filter((f) => f !== feature),
                  )
                }
              />
              {r(feature)}
            </label>
          ))}
        </fieldset>
        <p className="muted">{r("ratingHint")}</p>
        <Select
          label={r("clarity")}
          value={clarity}
          onChange={(e) => setClarity(e.target.value)}
        >
          {ratingOptions}
        </Select>
        <Select
          label={r("usefulness")}
          value={usefulness}
          onChange={(e) => setUsefulness(e.target.value)}
        >
          {ratingOptions}
        </Select>
        <Select
          label={r("riskClarity")}
          value={risk}
          onChange={(e) => setRisk(e.target.value)}
        >
          {ratingOptions}
        </Select>
        <label className="field">
          <span>{r("unresolved")}</span>
          <textarea
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            rows={3}
          />
        </label>
        <Input
          label={r("priority")}
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          required
        />
        <label className="field">
          <span>{r("suggestion")}</span>
          <textarea
            value={suggestion}
            onChange={(e) => setSuggestion(e.target.value)}
            rows={3}
          />
        </label>
        <label className="research-check">
          <input
            type="checkbox"
            checked={followUp}
            onChange={(e) => setFollowUp(e.target.checked)}
          />
          {r("followUp")}
        </label>
        <label className="research-check">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            required
          />
          {r("consent")}
        </label>
      </fieldset>
      {status === "saved" ? (
        <Alert tone="success">
          {r("saved")} {receipt}
        </Alert>
      ) : (
        <>
          {["invalid", "unknown", "rejected"].includes(status) && (
            <Alert tone="error">
              {r(status as "invalid" | "unknown" | "rejected")}
            </Alert>
          )}
          <Button type="submit" disabled={!enabled || status === "saving"}>
            {r(
              status === "saving"
                ? "saving"
                : status === "unknown"
                  ? "retry"
                  : "submit",
            )}
          </Button>
        </>
      )}
    </form>
  );
}
