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

type Draft = {
  used: Feedback["features_used"];
  clarity: string;
  usefulness: string;
  risk: string;
  priority: string;
  problem: string;
  suggestion: string;
  consent: boolean;
  followUp: boolean;
  status: "idle" | "saving" | "saved" | "invalid" | "unknown" | "rejected";
  receipt: string;
  intent: Feedback | null;
  uncertain: boolean;
};
function emptyDraft(): Draft {
  return {
    used: [],
    clarity: "",
    usefulness: "",
    risk: "",
    priority: "",
    problem: "",
    suggestion: "",
    consent: false,
    followUp: false,
    status: "idle",
    receipt: "",
    intent: null,
    uncertain: false,
  };
}
function unsaved(draft: Draft) {
  return (
    draft.status !== "saved" &&
    Boolean(
      draft.intent ||
        draft.used.length ||
        draft.clarity ||
        draft.usefulness ||
        draft.risk ||
        draft.priority ||
        draft.problem ||
        draft.suggestion ||
        draft.consent ||
        draft.followUp,
    )
  );
}

export function FeedbackForm({
  api,
  businessId,
  enabled,
  drafts,
  scope = "standalone",
}: {
  api: ApiClient;
  businessId: string;
  enabled: boolean;
  drafts?: Map<string, unknown>;
  scope?: string;
}) {
  const { locale, r } = useResearchText();
  // Runtime's map is scoped to the auth generation and is destroyed at logout.
  // Never write questionnaire text or POST bodies to Web Storage.
  const key = `${scope}:${businessId}:research-feedback`;
  const marker = `${key}-unsaved`;
  const [draft, setDraft] = useState<Draft>(
    () => (drafts?.get(key) as Draft | undefined) ?? emptyDraft(),
  );
  const current = useRef(draft);
  const {
    used,
    clarity,
    usefulness,
    risk,
    priority,
    problem,
    suggestion,
    consent,
    followUp,
    status,
    receipt,
  } = draft;
  const busy = useRef(false);
  const active = useRef(true);
  const controller = useRef<AbortController | null>(null);
  function update(patch: Partial<Draft>) {
    const next = { ...current.current, ...patch };
    current.current = next;
    drafts?.set(key, next);
    if (unsaved(next)) drafts?.set(marker, true);
    else drafts?.delete(marker);
    if (active.current) setDraft(next);
  }
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      controller.current?.abort();
      // An aborted POST may already be committed. Keep its exact intent for
      // explicit replay when this business is reopened in the same session.
      if (current.current.status === "saving") {
        const next: Draft = {
          ...current.current,
          status: "unknown",
          uncertain: true,
        };
        current.current = next;
        drafts?.set(key, next);
        drafts?.set(marker, true);
      }
    };
  }, [drafts, key, marker]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!enabled || busy.current || status === "saved") return;
    const payload =
      current.current.intent ??
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
      update({ status: "invalid" });
      return;
    }
    busy.current = true;
    update({ intent: payload, status: "saving" });
    const request = new AbortController();
    controller.current = request;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const response = await Promise.race([
        api.request(`/businesses/${businessId}/research/feedback`, {
          method: "POST",
          body: JSON.stringify(payload),
          signal: request.signal,
        }),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(() => {
            request.abort();
            reject(new ApiError(0, "TIMEOUT"));
          }, 20000);
        }),
      ]);
      if (!active.current) return;
      if (request.signal.aborted) throw new ApiError(0, "TIMEOUT");
      if (
        !response ||
        typeof response !== "object" ||
        !("id" in response) ||
        !("client_request_id" in response) ||
        response.client_request_id !== payload.client_request_id ||
        typeof response.id !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          response.id,
        ) ||
        !("created_at" in response) ||
        typeof response.created_at !== "string" ||
        !Number.isFinite(Date.parse(response.created_at))
      )
        throw new ApiError(0, "INVALID_RESPONSE");
      update({ receipt: response.id, status: "saved", uncertain: false });
    } catch (error) {
      if (!active.current) return;
      if (
        error instanceof ApiError &&
        error.status >= 400 &&
        error.status < 500 &&
        error.status !== 409 &&
        !current.current.uncertain
      ) {
        update({ intent: null, status: "rejected" });
      } else update({ status: "unknown", uncertain: true });
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
      {enabled && status !== "saved" && (
        <p role="status">{r(unsaved(draft) ? "unsaved" : "notSubmitted")}</p>
      )}
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
                  update({
                    used: e.target.checked
                      ? [...used, feature]
                      : used.filter((f) => f !== feature),
                  })
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
          onChange={(e) => update({ clarity: e.target.value })}
        >
          {ratingOptions}
        </Select>
        <Select
          label={r("usefulness")}
          value={usefulness}
          onChange={(e) => update({ usefulness: e.target.value })}
        >
          {ratingOptions}
        </Select>
        <Select
          label={r("riskClarity")}
          value={risk}
          onChange={(e) => update({ risk: e.target.value })}
        >
          {ratingOptions}
        </Select>
        <label className="field">
          <span>{r("unresolved")}</span>
          <textarea
            value={problem}
            onChange={(e) => update({ problem: e.target.value })}
            rows={3}
          />
        </label>
        <Input
          label={r("priority")}
          value={priority}
          onChange={(e) => update({ priority: e.target.value })}
          required
        />
        <label className="field">
          <span>{r("suggestion")}</span>
          <textarea
            value={suggestion}
            onChange={(e) => update({ suggestion: e.target.value })}
            rows={3}
          />
        </label>
        <label className="research-check">
          <input
            type="checkbox"
            checked={followUp}
            onChange={(e) => update({ followUp: e.target.checked })}
          />
          {r("followUp")}
        </label>
        <label className="research-check">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => update({ consent: e.target.checked })}
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
          {!locked && unsaved(draft) && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                if (window.confirm(r("discardConfirm"))) update(emptyDraft());
              }}
            >
              {r("discard")}
            </Button>
          )}
        </>
      )}
    </form>
  );
}
