import { useRef, useState, type FormEvent } from "react";
import { postInquiry } from "../explore/api";
import { ApiError } from "../../shared/api/client";
import { useT, type Key } from "../explore/i18n";
import type { InquiryInput, InquiryResult } from "../explore/types";

const newId = () => crypto.randomUUID();
type Errors = Partial<Record<"name" | "contact" | "message", Key>>;
export default function InquiryForm({ businessId }: { businessId: string }) {
  const { t } = useT();
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [done, setDone] = useState<InquiryResult | null>(null);
  // Один id на заявку: сетевой повтор не создаст дубль на сервере
  const requestId = useRef(newId());
  const pending = useRef<InquiryInput | null>(null);
  const lock = useRef(false);

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (lock.current) return;
    const err: Errors = {};
    if (!name.trim()) err.name = "required";
    if (!contact.trim()) err.contact = "required";
    if (!message.trim()) err.message = "required";
    setErrors(err);
    if (Object.keys(err).length) return;
    lock.current = true;
    setSending(true);
    setFailed(false);
    try {
      pending.current ??= {
        client_request_id: requestId.current,
        contact: contact.trim(),
        message: message.trim(),
        visitor_name: name.trim(),
      };
      const res = await postInquiry(businessId, pending.current);
      pending.current = null;
      setDone(res); // форму очищаем только после ответа
    } catch (e) {
      if (
        e instanceof ApiError &&
        e.status > 0 &&
        e.status < 500 &&
        e.status !== 408
      )
        pending.current = null;
      setFailed(true); // введённый текст остаётся
    } finally {
      lock.current = false;
      setSending(false);
    }
  };

  if (done)
    return (
      <section className="inq inq--ok" aria-live="polite">
        <h2>{t("sent_title")}</h2>
        <p className="muted">{t("sent_text")}</p>
        <button
          type="button"
          className="btn"
          onClick={() => {
            requestId.current = newId();
            setDone(null);
            setName("");
            setContact("");
            setMessage("");
          }}
        >
          {t("send_another")}
        </button>
      </section>
    );

  return (
    <section className="inq" aria-labelledby="inq-h">
      <h2 id="inq-h">{t("inquiry")}</h2>
      <form onSubmit={submit} noValidate>
        <fieldset disabled={sending || !!pending.current}>
          <label>
            {t("name")}
            <input
              value={name}
              maxLength={100}
              autoComplete="name"
              aria-required="true"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "name-error" : undefined}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          {/* Outside the label so the field keeps the accessible name "Имя посетителя". */}
          {errors.name && (
            <small id="name-error" className="err" role="alert">
              {t(errors.name)}
            </small>
          )}

          <label>
            {t("contact")}
            <input
              value={contact}
              maxLength={200}
              autoComplete="tel"
              inputMode="text"
              aria-required="true"
              aria-invalid={!!errors.contact}
              aria-describedby={
                errors.contact ? "contact-hint contact-error" : "contact-hint"
              }
              onChange={(e) => setContact(e.target.value)}
            />
            <small id="contact-hint" className="muted">
              {t("contact_hint")}
            </small>
            {errors.contact && (
              <small id="contact-error" className="err" role="alert">
                {t(errors.contact)}
              </small>
            )}
          </label>

          <label>
            {t("message")}
            <textarea
              rows={4}
              value={message}
              maxLength={2000}
              aria-required="true"
              aria-invalid={!!errors.message}
              onChange={(e) => setMessage(e.target.value)}
            />
            {errors.message && (
              <small className="err" role="alert">
                {t(errors.message)}
              </small>
            )}
          </label>
        </fieldset>
        {failed && (
          <p className="err" role="alert">
            {t("send_error")}
          </p>
        )}
        <button
          className="btn btn--primary"
          type="submit"
          disabled={sending}
          aria-busy={sending}
        >
          {sending ? t("sending") : t("send")}
        </button>
      </form>
    </section>
  );
}
