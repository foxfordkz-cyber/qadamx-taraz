import { useRef, useState, type FormEvent } from "react";
import { useI18n } from "../../shared/i18n";
import { ApiError } from "../../shared/api/client";
import { postInquiry } from "../explore/api";
import type { InquiryInput, InquiryResult } from "../explore/types";

const newId = () => crypto.randomUUID();

const messages = {
  ru: {
    title: "Оставить заявку",
    context: "Получатель заявки:",
    currentShop: "этот магазин",
    name: "Ваше имя",
    contact: "Как с вами связаться",
    contactHint:
      "Телефон, email, Telegram или другой удобный контакт. Его увидит только этот магазин.",
    message: "Что вы ищете?",
    required: "Обязательное поле",
    nameTooLong: "Не более 100 символов",
    contactTooLong: "Не более 200 символов",
    messageTooLong: "Не более 2000 символов",
    send: "Отправить заявку",
    sending: "Отправляем…",
    retry: "Повторить отправку",
    rejected:
      "Сервер не принял заявку. Поля сохранены — проверьте их или попробуйте позже.",
    unknown:
      "Не удалось подтвердить, создана ли заявка. Повторите отправку с теми же данными; не создавайте новую, пока не получите подтверждение.",
    sent: "Заявка отправлена:",
    requestNumber: "Номер заявки",
    sentHint: "Ответ и наличие товара зависят от продавца.",
    another: "Отправить ещё одну",
  },
  kk: {
    title: "Өтінім қалдыру",
    context: "Өтінімді алушы:",
    currentShop: "осы дүкен",
    name: "Атыңыз",
    contact: "Сізбен қалай байланысуға болады",
    contactHint:
      "Телефон, email, Telegram немесе басқа байланыс жолы. Оны тек осы дүкен көреді.",
    message: "Не іздеп жүрсіз?",
    required: "Міндетті өріс",
    nameTooLong: "100 таңбадан аспасын",
    contactTooLong: "200 таңбадан аспасын",
    messageTooLong: "2000 таңбадан аспасын",
    send: "Өтінім жіберу",
    sending: "Жіберілуде…",
    retry: "Қайта жіберу",
    rejected:
      "Сервер өтінімді қабылдамады. Өрістер сақталды — тексеріп, кейінірек қайталап көріңіз.",
    unknown:
      "Өтінімнің жасалғанын растау мүмкін болмады. Сол деректермен қайта жіберіңіз; растау алынғанша жаңа өтінім жасамаңыз.",
    sent: "Өтінім жіберілді:",
    requestNumber: "Өтінім нөмірі",
    sentHint: "Жауап пен тауардың бар-жоғын сатушы анықтайды.",
    another: "Тағы бір өтінім жіберу",
  },
} as const;

type Field = "name" | "contact" | "message";
type FieldErrors = Partial<
  Record<
    Field,
    "required" | "nameTooLong" | "contactTooLong" | "messageTooLong"
  >
>;
type Failure = "rejected" | "unknown" | null;
type Props = { businessId: string; businessName?: string };

export default function InquiryForm({ businessId, businessName }: Props) {
  const { locale } = useI18n();
  const t = messages[locale];
  const storeName = businessName?.trim() || t.currentShop;
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<Failure>(null);
  const [done, setDone] = useState<InquiryResult | null>(null);
  const requestId = useRef(newId());
  const pending = useRef<InquiryInput | null>(null);
  const lock = useRef(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (lock.current) return;

    const values = {
      visitor_name: name.trim(),
      contact: contact.trim(),
      message: message.trim(),
    };
    const nextErrors: FieldErrors = {};
    if (!values.visitor_name) nextErrors.name = "required";
    else if (values.visitor_name.length > 100) nextErrors.name = "nameTooLong";
    if (!values.contact) nextErrors.contact = "required";
    else if (values.contact.length > 200) nextErrors.contact = "contactTooLong";
    if (!values.message) nextErrors.message = "required";
    else if (values.message.length > 2000)
      nextErrors.message = "messageTooLong";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    lock.current = true;
    setSending(true);
    setFailure(null);
    try {
      pending.current ??= {
        ...values,
        client_request_id: requestId.current,
      };
      const receipt = await postInquiry(businessId, pending.current);
      pending.current = null;
      setDone(receipt);
    } catch (error) {
      const definitivelyRejected =
        error instanceof ApiError &&
        error.status >= 400 &&
        error.status < 500 &&
        error.status !== 408 &&
        error.status !== 409;
      if (definitivelyRejected) {
        pending.current = null;
        requestId.current = newId();
        setFailure("rejected");
      } else {
        setFailure("unknown");
      }
    } finally {
      lock.current = false;
      setSending(false);
    }
  };

  if (done)
    return (
      <section className="inq inq--ok" aria-live="polite">
        <h2>{t.sent}</h2>
        <p>
          <strong>{storeName}</strong>
        </p>
        <p>
          {t.requestNumber}: <strong>{done.id}</strong>
        </p>
        <p className="muted">{t.sentHint}</p>
        <button
          type="button"
          className="btn"
          onClick={() => {
            requestId.current = newId();
            setDone(null);
            setName("");
            setContact("");
            setMessage("");
            setErrors({});
            setFailure(null);
          }}
        >
          {t.another}
        </button>
      </section>
    );

  const fieldError = (field: Field) =>
    errors[field] ? t[errors[field]!] : undefined;

  return (
    <section className="inq" aria-labelledby="inq-h">
      <h2 id="inq-h">{t.title}</h2>
      <p className="muted">
        {t.context} <strong>{storeName}</strong>
      </p>
      <form onSubmit={submit} noValidate>
        <fieldset disabled={sending || pending.current !== null}>
          <label>
            <span>{t.name} *</span>
            <input
              name="visitor_name"
              value={name}
              maxLength={100}
              autoComplete="name"
              required
              aria-required="true"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "inq-name-error" : undefined}
              onChange={(event) => setName(event.target.value)}
            />
            {errors.name && (
              <small id="inq-name-error" className="err" role="alert">
                {fieldError("name")}
              </small>
            )}
          </label>

          <label>
            <span>{t.contact} *</span>
            <input
              name="contact"
              value={contact}
              maxLength={200}
              autoComplete="tel"
              inputMode="text"
              required
              aria-required="true"
              aria-invalid={!!errors.contact}
              aria-describedby={
                errors.contact
                  ? "inq-contact-hint inq-contact-error"
                  : "inq-contact-hint"
              }
              onChange={(event) => setContact(event.target.value)}
            />
            <small id="inq-contact-hint" className="muted">
              {t.contactHint}
            </small>
            {errors.contact && (
              <small id="inq-contact-error" className="err" role="alert">
                {fieldError("contact")}
              </small>
            )}
          </label>

          <label>
            <span>{t.message} *</span>
            <textarea
              name="message"
              rows={4}
              value={message}
              maxLength={2000}
              required
              aria-required="true"
              aria-invalid={!!errors.message}
              aria-describedby={
                errors.message ? "inq-message-error" : undefined
              }
              onChange={(event) => setMessage(event.target.value)}
            />
            {errors.message && (
              <small id="inq-message-error" className="err" role="alert">
                {fieldError("message")}
              </small>
            )}
          </label>
        </fieldset>
        {failure && (
          <p className="err" role="alert" aria-live="assertive">
            {t[failure]}
          </p>
        )}
        <button
          className="btn btn--primary"
          type="submit"
          disabled={sending}
          aria-busy={sending}
        >
          {sending ? t.sending : failure === "unknown" ? t.retry : t.send}
        </button>
      </form>
    </section>
  );
}
