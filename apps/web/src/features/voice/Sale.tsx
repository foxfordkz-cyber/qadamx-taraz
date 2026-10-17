// Input → review → explicit save, adapted from PR #7 into Seller runtime/UI/i18n.
import { useEffect, useId, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useBusiness, useRuntime } from "../../app/runtime";
import { CustomerPicker } from "../seller/Customers";
import type { Customer } from "../../shared/api/models";
import {
  Button,
  Card,
  Dialog,
  ErrorState,
  errorKey,
  Input,
  PageHeader,
  Select,
} from "../../shared/ui";
import { formatKZT } from "../../shared/format";
import {
  readDraft,
  toMinor,
  useLedgerList,
  useWrite,
  type Draft,
  type Sale as OpenSale,
} from "../ledger/data";
import { saleDate, useLedgerText } from "../ledger/i18n";
import { TechDetails } from "../ledger/TechDetails";
import { useI18n } from "../../shared/i18n";
import { Stats } from "../summary/Summary";
import { AudioInput } from "./AudioInput";
import { AudioPreview } from "./AudioPreview";
import { AI_REQUEST_TIMEOUT_MS, MAX_AI_TEXT } from "./audioContract";
import { clarifiedText, validText } from "./draftInput";
import { AnalysisError } from "./AnalysisError";
import { useVoiceText } from "./i18n";
import { ApiError } from "../../shared/api/client";
import "../ledger/ledger.css";
export function Sale() {
  const { scope } = useRuntime(),
    { business } = useBusiness();
  return <SaleForm key={`${scope}:${business.id}`} />;
}
function SaleForm() {
  const textLabelId = useId(),
    reviewId = useId();
  const { api, gateway } = useRuntime(),
    { business } = useBusiness(),
    { l, locale } = useLedgerText(),
    [params] = useSearchParams(),
    { v } = useVoiceText(),
    { t } = useI18n();
  const [capturing, setCapturing] = useState(false),
    [parseNotice, setParseNotice] = useState<"cancelled" | "timeout" | null>(
      null,
    );
  const [inputLocale, setInputLocale] = useState<"ru" | "kk" | "auto" | null>(
      null,
    ),
    [clarification, setClarification] = useState(""),
    [needsAnalysis, setNeedsAnalysis] = useState(false),
    [textInvalid, setTextInvalid] = useState(false);
  const [kind, setKind] = useState(params.get("sale") ? "repayment" : "sale"),
    [saleId, setSaleId] = useState(params.get("sale") ?? "");
  const [total, setTotal] = useState(""),
    [paid, setPaid] = useState(""),
    [amount, setAmount] = useState(""),
    [description, setDescription] = useState("");
  const [customer, setCustomer] = useState<Customer | null>(null),
    [picker, setPicker] = useState(false),
    [text, setText] = useState(""),
    [file, setFile] = useState<File | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null),
    [parsing, setParsing] = useState(false),
    [parseError, setParseError] = useState<unknown>(null),
    [saved, setSaved] = useState(false),
    [invalid, setInvalid] = useState(false),
    [manual, setManual] = useState(!!params.get("sale"));
  const parseLock = useRef(false),
    write = useWrite(),
    sales = useLedgerList<OpenSale>("outstanding_only=true");
  const activeParse = useRef<{
    controller: AbortController;
    timer?: ReturnType<typeof setTimeout>;
  } | null>(null);
  useEffect(
    () => () => {
      const pending = activeParse.current;
      activeParse.current = null;
      clearTimeout(pending?.timer);
      pending?.controller.abort();
    },
    [],
  );
  const rows = sales.data?.pages.flatMap((p) => p.items) ?? [],
    balance = rows.find((s) => s.id === saleId)?.balance_minor;
  const totalMinor = toMinor(total),
    paidMinor = toMinor(paid),
    amountMinor = toMinor(amount);
  const valid =
    kind === "sale"
      ? totalMinor !== null &&
        totalMinor > 0 &&
        paidMinor !== null &&
        paidMinor <= totalMinor &&
        (paidMinor === totalMinor || customer?.business_id === business.id)
      : kind === "repayment" &&
        amountMinor !== null &&
        amountMinor > 0 &&
        balance !== undefined &&
        amountMinor <= balance;
  const disabled =
    write.busy || !!write.pending || parsing || gateway.mode !== "live";
  async function parse(override?: string) {
    const sourceFile = override === undefined ? file : null;
    const sourceText = override ?? text;
    if (
      parseLock.current ||
      disabled ||
      capturing ||
      (!sourceFile && !sourceText.trim())
    )
      return;
    if (!sourceFile && !validText(sourceText)) {
      setTextInvalid(true);
      return;
    }
    parseLock.current = true;
    setParsing(true);
    setParseError(null);
    setParseNotice(null);
    setTextInvalid(false);
    setNeedsAnalysis(true);
    const request = {
      controller: new AbortController(),
      timer: undefined as ReturnType<typeof setTimeout> | undefined,
    };
    activeParse.current = request;
    request.timer = setTimeout(() => {
      if (activeParse.current !== request) return;
      activeParse.current = null;
      parseLock.current = false;
      request.controller.abort();
      setParsing(false);
      setParseNotice("timeout");
      setParseError(new ApiError(504, "AI_TIMEOUT"));
    }, AI_REQUEST_TIMEOUT_MS);
    try {
      const form = new FormData();
      if (sourceFile) form.append("audio", sourceFile);
      else form.append("text", sourceText.trim());
      form.append("locale", inputLocale ?? locale);
      const d = readDraft(
        await api.request(`/businesses/${business.id}/drafts`, {
          method: "POST",
          body: form,
          signal: request.controller.signal,
        }),
      );
      if (activeParse.current !== request) return;
      setDraft(d);
      setNeedsAnalysis(false);
      setClarification("");
      setKind(d.kind === "unknown" ? "" : d.kind);
      setDescription(d.description ?? "");
      setTotal(d.total_minor === null ? "" : String(d.total_minor / 100));
      setPaid(d.received_minor === null ? "" : String(d.received_minor / 100));
      setAmount(d.amount_minor === null ? "" : String(d.amount_minor / 100));
      setCustomer(null);
      setSaleId("");
      showReview();
    } catch (e) {
      if (activeParse.current === request) setParseError(e);
    } finally {
      clearTimeout(request.timer);
      if (activeParse.current === request) {
        activeParse.current = null;
        parseLock.current = false;
        setParsing(false);
      }
    }
  }
  function cancelAnalysis() {
    const pending = activeParse.current;
    if (!pending) return;
    activeParse.current = null;
    clearTimeout(pending.timer);
    pending.controller.abort();
    parseLock.current = false;
    setParsing(false);
    setParseError(null);
    setParseNotice("cancelled");
  }
  function clarify() {
    if (!draft || disabled || capturing) return;
    const combined = clarifiedText(draft.transcript, clarification);
    if (!combined) {
      setTextInvalid(true);
      return;
    }
    setText(combined);
    setFile(null);
    void parse(combined);
  }
  function sourceChanged() {
    setTextInvalid(false);
    setParseError(null);
    setParseNotice(null);
    if (draft) setNeedsAnalysis(true);
    setDraft(null);
    setClarification("");
  }
  async function save() {
    if (
      write.busy ||
      parsing ||
      gateway.mode !== "live" ||
      capturing ||
      (needsAnalysis && !write.pending)
    )
      return;
    if (!write.pending && !valid) {
      setInvalid(true);
      return;
    }
    const ok = await write.write(
      kind === "sale"
        ? {
            kind: "sale",
            draft_id: draft?.id ?? null,
            description,
            customer_id: customer?.id ?? null,
            total_minor: totalMinor!,
            received_minor: paidMinor!,
          }
        : {
            kind: "repayment",
            draft_id: draft?.id ?? null,
            description,
            sale_id: saleId,
            amount_minor: amountMinor!,
          },
    );
    if (ok) setSaved(true);
  }
  // The stacked layout keeps the form below the AI card: bring it into view.
  function showReview() {
    if (window.matchMedia?.("(max-width: 1100px)").matches)
      document
        .getElementById(reviewId)
        ?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }
  function chooseManual() {
    setManual(true);
    setDraft(null);
    setNeedsAnalysis(false);
    setClarification("");
    setParseError(null);
    setParseNotice(null);
    showReview();
  }
  const formError =
    kind === "sale" &&
    totalMinor !== null &&
    paidMinor !== null &&
    paidMinor > totalMinor
      ? v("overpayment")
      : invalid && !valid
        ? l("required")
        : null;
  // Steps are derived from what the seller has done; they never gate the form.
  const hasSource = !!file || !!text.trim(),
    anyManual = !!(
      total ||
      paid ||
      amount ||
      description.trim() ||
      customer ||
      saleId
    );
  const stage =
    !draft && !manual && (hasSource || !anyManual)
      ? "input"
      : valid && !needsAnalysis
        ? "confirm"
        : "review";
  const primary = parseError
    ? "retry"
    : stage === "input"
      ? "prepare"
      : "confirm";
  const steps = ["input", "review", "confirm"] as const;
  const stepLabel = {
    input: l("stepInput"),
    review: l("stepReview"),
    confirm: l("stepConfirm"),
  };
  return (
    <>
      <PageHeader title={l("sale")} />
      <Stats />
      {gateway.mode === "demo" && <p>{l("demo")}</p>}
      {saved ? (
        <Card>
          <p role="status">{l("saved")}</p>
          <Button
            onClick={() => {
              setSaved(false);
              setDraft(null);
              setText("");
              setFile(null);
              setTotal("");
              setPaid("");
              setAmount("");
              setDescription("");
              setCustomer(null);
              setSaleId("");
              setInvalid(false);
              setClarification("");
              setNeedsAnalysis(false);
              setTextInvalid(false);
              setManual(false);
            }}
          >
            {l("again")}
          </Button>
        </Card>
      ) : (
        <>
          <ol className="sale-steps" aria-label={l("steps")}>
            {steps.map((step, i) => (
              <li
                key={step}
                aria-current={stage === step ? "step" : undefined}
                className={i < steps.indexOf(stage) ? "is-done" : undefined}
              >
                <span aria-hidden="true">{i + 1}</span>
                {stepLabel[step]}
              </li>
            ))}
          </ol>
          <div
            className={`ledger-columns${params.get("sale") ? " ledger-review-first" : ""}`}
          >
            <Card>
              <h2>{l("aiTitle")}</h2>
              <fieldset disabled={disabled} className="ledger-stack">
                <label className="field">
                  <span id={textLabelId}>{l("text")}</span>
                  <textarea
                    aria-labelledby={textLabelId}
                    maxLength={MAX_AI_TEXT * 2}
                    disabled={capturing}
                    value={text}
                    onChange={(e) => {
                      sourceChanged();
                      setText(e.target.value);
                      setFile(null);
                    }}
                  />
                </label>
                <div className="sale-audio">
                  <AudioInput
                    disabled={disabled}
                    onBusyChange={setCapturing}
                    onReset={() => {
                      sourceChanged();
                      setFile(null);
                    }}
                    onFile={(f) => {
                      sourceChanged();
                      setFile(f);
                    }}
                  />
                  {file && (
                    <AudioPreview
                      file={file}
                      disabled={disabled || capturing}
                      onDelete={() => {
                        sourceChanged();
                        setFile(null);
                      }}
                    />
                  )}
                  <p className="ledger-hint">{v("sequence")}</p>
                </div>
                <Select
                  label={v("language")}
                  value={inputLocale ?? locale}
                  disabled={capturing}
                  onChange={(e) =>
                    setInputLocale(e.target.value as "ru" | "kk" | "auto")
                  }
                >
                  <option value="auto">{v("autoLanguage")}</option>
                  <option value="ru">Русский</option>
                  <option value="kk">Қазақша</option>
                </Select>
                <Button
                  variant={primary === "prepare" ? "primary" : "secondary"}
                  onClick={() => void parse()}
                  disabled={disabled || capturing || (!file && !text.trim())}
                >
                  {l("prepare")}
                </Button>
              </fieldset>
              {textInvalid && (
                <p className="ledger-error" role="alert">
                  {v("textLimit")}
                </p>
              )}
              {parsing && (
                <div className="voice-actions">
                  <p role="status">{v("analysing")}</p>
                  <Button variant="secondary" onClick={cancelAnalysis}>
                    {v("cancelAnalysis")}
                  </Button>
                </div>
              )}
              {parseNotice && !parseError && (
                <p role="status">{v(parseNotice)}</p>
              )}
              {parseError ? (
                <div className="alert alert-error ledger-alert" role="alert">
                  <AnalysisError
                    error={parseError}
                    fallback={l("aiUnavailable")}
                  />
                  <div className="actions">
                    <Button
                      disabled={
                        disabled || capturing || (!file && !text.trim())
                      }
                      onClick={() => void parse()}
                    >
                      {v("retryAnalysis")}
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={disabled || capturing}
                      onClick={chooseManual}
                    >
                      {l("manual")}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  disabled={disabled || capturing}
                  onClick={chooseManual}
                >
                  {l("manual")}
                </Button>
              )}
            </Card>
            <Card id={reviewId} className="ledger-review">
              <h2>{l("review")}</h2>
              <p className="ledger-hint">{l("hint")}</p>
              {write.pending ? (
                <div className="alert alert-error ledger-alert" role="alert">
                  <p>{l("unknown")}</p>
                  <Button disabled={write.busy} onClick={() => void save()}>
                    {l("retry")}
                  </Button>
                </div>
              ) : (
                <>
                  {draft && (
                    <div className="ledger-draft">
                      <blockquote>{draft.transcript}</blockquote>
                      {draft.questions.length > 0 && (
                        <ul>
                          {draft.questions.map((q, i) => (
                            <li key={i}>{q}</li>
                          ))}
                        </ul>
                      )}
                      <small>
                        {l("expiry")}:{" "}
                        {new Date(draft.expires_at).toLocaleTimeString(locale)}
                      </small>
                      <details>
                        <summary>{v("clarifyTitle")}</summary>
                        <p>{v("clarificationHint")}</p>
                        <Input
                          label={v("clarification")}
                          value={clarification}
                          maxLength={2000}
                          disabled={disabled || capturing}
                          onChange={(e) => {
                            setClarification(e.target.value);
                            setNeedsAnalysis(true);
                            setTextInvalid(false);
                          }}
                        />
                        <Button
                          variant="secondary"
                          disabled={
                            disabled || capturing || !clarification.trim()
                          }
                          onClick={clarify}
                        >
                          {v("clarify")}
                        </Button>
                      </details>
                    </div>
                  )}
                  {needsAnalysis && !parseError && (
                    <p className="ledger-hint" role="status">
                      {v("changed")}
                    </p>
                  )}
                  <fieldset disabled={disabled} className="ledger-stack">
                    <Select
                      label={l("kind")}
                      value={kind}
                      onChange={(e) => setKind(e.target.value)}
                    >
                      <option value="">—</option>
                      <option value="sale">{l("sell")}</option>
                      <option value="repayment">{l("repay")}</option>
                    </Select>
                    <Input
                      label={l("description")}
                      maxLength={1000}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                    {kind === "sale" ? (
                      <>
                        <div className="ledger-pair">
                          <Input
                            inputMode="decimal"
                            label={l("total")}
                            value={total}
                            onChange={(e) => setTotal(e.target.value)}
                          />
                          <Input
                            inputMode="decimal"
                            label={l("paid")}
                            value={paid}
                            onChange={(e) => setPaid(e.target.value)}
                          />
                        </div>
                        <div className="field">
                          <span>{l("customer")}</span>
                          <div className="ledger-customer">
                            <strong>{customer?.display_name ?? "—"}</strong>
                            <Button
                              variant="secondary"
                              onClick={() => setPicker(true)}
                            >
                              {l("choose")}
                            </Button>
                          </div>
                          {totalMinor !== null &&
                            paidMinor !== null &&
                            paidMinor < totalMinor &&
                            !customer && <small>{v("customerNeeded")}</small>}
                        </div>
                        {totalMinor !== null &&
                          paidMinor !== null &&
                          paidMinor <= totalMinor && (
                            <p className="ledger-remaining">
                              {v("remaining")}:{" "}
                              <strong>
                                {formatKZT(totalMinor - paidMinor, locale)}
                              </strong>
                            </p>
                          )}
                      </>
                    ) : kind === "repayment" ? (
                      <>
                        <Select
                          label={l("open")}
                          value={saleId}
                          onChange={(e) => setSaleId(e.target.value)}
                        >
                          <option value="">—</option>
                          {rows.map((s) => (
                            <option key={s.id} value={s.id}>
                              {`${s.description} · ${formatKZT(s.balance_minor, locale)} · ${saleDate(s.created_at)}`}
                            </option>
                          ))}
                        </Select>
                        {sales.isError && (
                          <ErrorState
                            error={sales.error}
                            retry={() => void sales.refetch()}
                          />
                        )}
                        {sales.hasNextPage && (
                          <Button
                            variant="secondary"
                            onClick={() => void sales.fetchNextPage()}
                          >
                            {l("more")}
                          </Button>
                        )}
                        <Input
                          inputMode="decimal"
                          label={l("amount")}
                          value={amount}
                          hint={
                            balance === undefined
                              ? undefined
                              : `${l("left")}: ${formatKZT(balance, locale)}`
                          }
                          onChange={(e) => setAmount(e.target.value)}
                        />
                      </>
                    ) : null}
                    {formError && (
                      <p className="ledger-error" role="alert">
                        {formError}
                      </p>
                    )}
                    {!!write.error && (
                      <div
                        className="alert alert-error ledger-alert"
                        role="alert"
                      >
                        <p>{t(errorKey(write.error))}</p>
                        <TechDetails error={write.error} />
                      </div>
                    )}
                    <Button
                      variant={primary === "confirm" ? "primary" : "secondary"}
                      onClick={() => void save()}
                      disabled={disabled || capturing || needsAnalysis}
                    >
                      {l("confirm")}
                    </Button>
                  </fieldset>
                </>
              )}
            </Card>
          </div>
        </>
      )}
      <Dialog
        title={l("choose")}
        open={picker}
        onClose={() => setPicker(false)}
      >
        <CustomerPicker
          value={customer}
          onChange={(c) => {
            setCustomer(c);
            setPicker(false);
          }}
        />
      </Dialog>
    </>
  );
}
