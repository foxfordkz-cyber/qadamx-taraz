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
  ErrorMessage,
  ErrorState,
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
import { useLedgerText } from "../ledger/i18n";
import { Stats } from "../summary/Summary";
import { AudioInput } from "./AudioInput";
import { AudioPreview } from "./AudioPreview";
import { AI_REQUEST_TIMEOUT_MS } from "./audioContract";
import { useVoiceText } from "./i18n";
import { ApiError } from "../../shared/api/client";
import "../ledger/ledger.css";
export function Sale() {
  const { scope } = useRuntime(),
    { business } = useBusiness();
  return <SaleForm key={`${scope}:${business.id}`} />;
}
function SaleForm() {
  const textLabelId = useId();
  const { api, gateway } = useRuntime(),
    { business } = useBusiness(),
    { l, locale } = useLedgerText(),
    [params] = useSearchParams(),
    { v } = useVoiceText();
  const [capturing, setCapturing] = useState(false),
    [parseNotice, setParseNotice] = useState<"cancelled" | "timeout" | null>(
      null,
    );
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
    [invalid, setInvalid] = useState(false);
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
  async function parse() {
    if (parseLock.current || disabled || capturing || (!file && !text.trim()))
      return;
    parseLock.current = true;
    setParsing(true);
    setParseError(null);
    setParseNotice(null);
    setDraft(null);
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
      if (file) form.append("audio", file);
      else form.append("text", text);
      form.append("locale", locale);
      const d = readDraft(
        await api.request(`/businesses/${business.id}/drafts`, {
          method: "POST",
          body: form,
          signal: request.controller.signal,
        }),
      );
      if (activeParse.current !== request) return;
      setDraft(d);
      setKind(d.kind === "unknown" ? "" : d.kind);
      setDescription(d.description ?? "");
      setTotal(d.total_minor === null ? "" : String(d.total_minor / 100));
      setPaid(d.received_minor === null ? "" : String(d.received_minor / 100));
      setAmount(d.amount_minor === null ? "" : String(d.amount_minor / 100));
      setCustomer(null);
      setSaleId("");
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
  async function save() {
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
            }}
          >
            {l("again")}
          </Button>
        </Card>
      ) : (
        <div className="ledger-columns">
          <Card>
            <h2>AI</h2>
            <p>{l("hint")}</p>
            <p>{v("sequence")}</p>
            <fieldset disabled={disabled}>
              <label className="field">
                <span id={textLabelId}>{l("text")}</span>
                <textarea
                  aria-labelledby={textLabelId}
                  maxLength={4000}
                  disabled={capturing}
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    setFile(null);
                  }}
                />
              </label>
              <AudioInput
                disabled={disabled}
                onBusyChange={setCapturing}
                onReset={() => setFile(null)}
                onFile={(f) => {
                  setFile(f);
                }}
              />
              {file && (
                <AudioPreview
                  file={file}
                  disabled={disabled || capturing}
                  onDelete={() => setFile(null)}
                />
              )}
              <Button
                onClick={() => void parse()}
                disabled={disabled || capturing || (!file && !text.trim())}
              >
                {l("prepare")}
              </Button>
            </fieldset>
            {parsing && (
              <div className="voice-actions">
                <p role="status">{v("analysing")}</p>
                <Button variant="secondary" onClick={cancelAnalysis}>
                  {v("cancelAnalysis")}
                </Button>
              </div>
            )}
            {parseNotice && <p role="status">{v(parseNotice)}</p>}
            {!!parseError && (
              <div role="alert">
                <p>{l("aiUnavailable")}</p>
                <ErrorMessage error={parseError} />
              </div>
            )}
            <Button
              variant="secondary"
              disabled={disabled}
              onClick={() => setDraft(null)}
            >
              {l("manual")}
            </Button>
          </Card>
          <Card>
            <h2>{l("review")}</h2>
            {write.pending ? (
              <>
                <p role="alert">{l("unknown")}</p>
                <Button disabled={write.busy} onClick={() => void save()}>
                  {l("retry")}
                </Button>
              </>
            ) : (
              <>
                {draft && (
                  <div>
                    <p>{draft.transcript}</p>
                    {draft.questions.map((q, i) => (
                      <p key={i}>{q}</p>
                    ))}
                    <small>
                      {l("expiry")}:{" "}
                      {new Date(draft.expires_at).toLocaleTimeString(locale)}
                    </small>
                  </div>
                )}
                <fieldset disabled={disabled} className="form-stack">
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
                      <p>
                        {l("customer")}: {customer?.display_name ?? "—"}
                      </p>
                      <Button
                        variant="secondary"
                        onClick={() => setPicker(true)}
                      >
                        {l("choose")}
                      </Button>
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
                            {s.description} ·{" "}
                            {formatKZT(s.balance_minor, locale)} ·{" "}
                            {s.id.slice(0, 8)}
                          </option>
                        ))}
                      </Select>
                      {sales.isError && (
                        <ErrorState
                          error={sales.error}
                          retry={() => void sales.refetch()}
                        />
                      )}{" "}
                      {sales.hasNextPage && (
                        <Button onClick={() => void sales.fetchNextPage()}>
                          {l("more")}
                        </Button>
                      )}
                      <Input
                        inputMode="decimal"
                        label={l("amount")}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                      />
                    </>
                  ) : null}
                  <Button onClick={() => void save()} disabled={disabled}>
                    {l("confirm")}
                  </Button>
                  {invalid && !valid && <p role="alert">{l("required")}</p>}
                </fieldset>
              </>
            )}
            {!!write.error && <ErrorMessage error={write.error} />}
          </Card>
        </div>
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
