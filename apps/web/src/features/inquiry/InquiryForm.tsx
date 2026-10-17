import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { ApiError } from "../../shared/api/client";
import { Alert, Button, Input } from "../../shared/ui";
import type { InquiryInput, InquiryResult } from "../explore/types";
import { sendInquiry, isUuid } from "./api";
import { useInquiryText, type InquiryTextKey } from "./i18n";
import "./inquiry.css";

export interface InquiryFormProps {
  businessId: string;
  /** Display only; never included in the request or used to select the recipient. */
  businessName: string;
}

type Field = "visitor_name" | "contact" | "message";
type Errors = Partial<Record<Field, InquiryTextKey>>;
type Attempt = { body: InquiryInput; businessName: string; uncertain: boolean };
const limits = { visitor_name: 100, contact: 200, message: 2000 } as const;
const empty = { visitor_name: "", contact: "", message: "" };

/** Own the reset boundary even when a caller does not provide a React key. */
export default function InquiryForm(props: InquiryFormProps) {
  return <InquirySession key={props.businessId} {...props} />;
}

function InquirySession({ businessId, businessName }: InquiryFormProps) {
  const t = useInquiryText();
  const id = useId();
  const [values, setValues] = useState(empty);
  const [errors, setErrors] = useState<Errors>({});
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<InquiryTextKey | null>(null);
  const [done, setDone] = useState<{
    receipt: InquiryResult;
    name: string;
  } | null>(null);
  const attempt = useRef<Attempt | null>(null);
  const lock = useRef(false);
  const alive = useRef(true);
  const controller = useRef<AbortController | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const result = useRef<HTMLDivElement>(null);
  const validShop = isUuid(businessId);
  const recovering = Boolean(attempt.current?.uncertain);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      controller.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (done) result.current?.focus();
  }, [done]);

  const change = (field: Field, value: string) => {
    setValues((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: undefined }));
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (lock.current || done || !validShop) return;
    if (!attempt.current) {
      const nextErrors: Errors = {};
      for (const field of Object.keys(limits) as Field[]) {
        const value = values[field].trim();
        if (!value) nextErrors[field] = "required";
        else if ([...value].length > limits[field])
          nextErrors[field] = "tooLong";
      }
      setErrors(nextErrors);
      const firstInvalid = Object.keys(nextErrors)[0];
      if (firstInvalid) {
        (
          form.current?.elements.namedItem(firstInvalid) as HTMLElement | null
        )?.focus();
        return;
      }
      // Secure-context UUID generation can fail before any HTTP request is made.
      try {
        attempt.current = {
          body: {
            client_request_id: crypto.randomUUID(),
            visitor_name: values.visitor_name.trim(),
            contact: values.contact.trim(),
            message: values.message.trim(),
          },
          businessName,
          uncertain: false,
        };
      } catch {
        setFailure("unavailable");
        return;
      }
    }
    const current = attempt.current;
    lock.current = true; // Protect the interval before React disables the button.
    setSending(true);
    setFailure(null);
    const request = new AbortController();
    controller.current = request;
    try {
      const receipt = await sendInquiry(businessId, current.body, request);
      if (!alive.current) return;
      setDone({ receipt, name: current.businessName });
      attempt.current = null;
    } catch (error) {
      if (!alive.current) return;
      const status = error instanceof ApiError ? error.status : 0;
      const unconfigured =
        error instanceof ApiError && error.code === "API_UNCONFIGURED";
      const rejected = [400, 401, 403, 404, 405, 413, 415, 422, 429].includes(
        status,
      );
      // A later rejection cannot resolve an earlier lost response. Retain its
      // exact body and key until a validated receipt arrives; never auto-retry.
      if (current.uncertain || (!rejected && !unconfigured)) {
        current.uncertain = true;
        setFailure(status === 409 ? "conflict" : "unknown");
      } else {
        attempt.current = null;
        setFailure(
          unconfigured
            ? "unavailable"
            : status === 429
              ? "rateLimited"
              : status === 404
                ? "shopMissing"
                : status === 422
                  ? "rejectedFields"
                  : "rejected",
        );
      }
    } finally {
      lock.current = false;
      if (alive.current) setSending(false);
    }
  }

  if (done) {
    return (
      <section className="inq inquiry-form" aria-labelledby={`${id}-success`}>
        <div ref={result} tabIndex={-1}>
          <Alert tone="success">
            <h2 id={`${id}-success`}>{t("sentTitle")}</h2>
            <p>
              {t("sentTo")} <strong>{done.name}</strong>.
            </p>
            <p>{t("sentText")}</p>
            <p className="inquiry-receipt">
              {t("receipt")}: <span>{done.receipt.id}</span>
            </p>
          </Alert>
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            setValues(empty);
            setErrors({});
            setFailure(null);
            setDone(null);
          }}
        >
          {t("another")}
        </Button>
      </section>
    );
  }

  return (
    <section className="inq inquiry-form" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`}>{t("title")}</h2>
      <p className="inquiry-context">
        {t("shop")}: <strong>{businessName}</strong>
      </p>
      {!validShop && <Alert tone="error">{t("shopMissing")}</Alert>}
      <form ref={form} onSubmit={submit} noValidate aria-busy={sending}>
        <p id={`${id}-required`} className="muted">
          {t("allRequired")}
        </p>
        <fieldset
          disabled={sending || !validShop}
          aria-describedby={`${id}-required`}
        >
          <Input
            name="visitor_name"
            label={t("name")}
            value={values.visitor_name}
            required
            maxLength={limits.visitor_name}
            autoComplete="name"
            inputMode="text"
            enterKeyHint="next"
            readOnly={recovering}
            error={errors.visitor_name && t(errors.visitor_name)}
            onChange={(event) => change("visitor_name", event.target.value)}
          />
          <Input
            name="contact"
            label={t("contact")}
            value={values.contact}
            required
            maxLength={limits.contact}
            autoComplete="off"
            inputMode="text"
            enterKeyHint="next"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            readOnly={recovering}
            hint={t("contactHint")}
            error={errors.contact && t(errors.contact)}
            onChange={(event) => change("contact", event.target.value)}
          />
          <label className="field" htmlFor={`${id}-message`}>
            <span id={`${id}-message-label`}>{t("message")}</span>
            <textarea
              id={`${id}-message`}
              name="message"
              aria-labelledby={`${id}-message-label`}
              rows={3}
              value={values.message}
              required
              maxLength={limits.message}
              readOnly={recovering}
              aria-invalid={Boolean(errors.message)}
              aria-describedby={
                errors.message ? `${id}-message-error` : undefined
              }
              onChange={(event) => change("message", event.target.value)}
            />
            {errors.message && (
              <small id={`${id}-message-error`} className="field-error">
                {t(errors.message)}
              </small>
            )}
          </label>
        </fieldset>
        {Object.values(errors).some(Boolean) && (
          <Alert tone="error">{t("checkFields")}</Alert>
        )}
        {failure && <Alert tone="error">{t(failure)}</Alert>}
        {recovering && <p className="muted">{t("keepAttempt")}</p>}
        <Button
          type="submit"
          disabled={sending || !validShop}
          aria-busy={sending}
        >
          {sending ? t("sending") : failure ? t("retry") : t("send")}
        </Button>
      </form>
    </section>
  );
}
