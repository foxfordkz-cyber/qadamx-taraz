import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useI18n } from "../../shared/i18n";
import { ApiError } from "../../shared/api/client";
import { Button } from "../../shared/ui";
import { postInquiry } from "../explore/api";
import type { InquiryInput, InquiryResult } from "../explore/types";
import "./inquiry.css";

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
    allRequired: "Все поля обязательны.",
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
    allRequired: "Барлық өрісті толтыру қажет.",
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
export type InquiryFormProps = { businessId: string; businessName: string };

export default function InquiryForm({
  businessId,
  businessName,
}: InquiryFormProps) {
  // A changed recipient owns a fresh form, even if a caller omits its key.
  return (
    <ShopInquiryForm
      key={businessId}
      businessId={businessId}
      businessName={businessName}
    />
  );
}

function ShopInquiryForm({ businessId, businessName }: InquiryFormProps) {
  const id = useId();
  const form = useRef<HTMLFormElement>(null);
  const confirmation = useRef<HTMLElement>(null);
  const returnToForm = useRef(false);
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
  const uncertain = useRef(false);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  useEffect(() => {
    if (done) confirmation.current?.focus();
    else if (returnToForm.current) {
      returnToForm.current = false;
      (
        form.current?.elements.namedItem("visitor_name") as HTMLElement | null
      )?.focus();
    }
  }, [done]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (lock.current || done) return;

    const values = {
      visitor_name: name.trim(),
      contact: contact.trim(),
      message: message.trim(),
    };
    const nextErrors: FieldErrors = {};
    if (!values.visitor_name) nextErrors.name = "required";
    else if (Array.from(values.visitor_name).length > 100)
      nextErrors.name = "nameTooLong";
    if (!values.contact) nextErrors.contact = "required";
    else if (Array.from(values.contact).length > 200)
      nextErrors.contact = "contactTooLong";
    if (!values.message) nextErrors.message = "required";
    else if (Array.from(values.message).length > 2000)
      nextErrors.message = "messageTooLong";
    setErrors(nextErrors);
    const firstInvalid = (["name", "contact", "message"] as const).find(
      (field) => nextErrors[field],
    );
    if (firstInvalid) {
      const inputName = firstInvalid === "name" ? "visitor_name" : firstInvalid;
      (
        form.current?.elements.namedItem(inputName) as HTMLElement | null
      )?.focus();
      return;
    }

    lock.current = true;
    setSending(true);
    setFailure(null);
    try {
      pending.current ??= {
        ...values,
        client_request_id: requestId.current,
      };
      const receipt = await postInquiry(businessId, pending.current);
      if (!active.current) return;
      pending.current = null;
      uncertain.current = false;
      setDone(receipt);
    } catch (error) {
      if (!active.current) return;
      const definitivelyRejected =
        !uncertain.current &&
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
        // A later rejection cannot prove that an earlier unknown POST failed.
        uncertain.current = true;
        setFailure("unknown");
      }
    } finally {
      lock.current = false;
      if (active.current) setSending(false);
    }
  };

  if (done)
    return (
      <section
        ref={confirmation}
        className="inq inq--ok inquiry-form"
        tabIndex={-1}
        aria-labelledby={`${id}-sent`}
      >
        <h2 id={`${id}-sent`}>{t.sent}</h2>
        <p>
          <strong>{storeName}</strong>
        </p>
        <p>
          {t.requestNumber}: <strong>{done.id}</strong>
        </p>
        <p className="muted">{t.sentHint}</p>
        <Button
          variant="secondary"
          onClick={() => {
            returnToForm.current = true;
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
        </Button>
      </section>
    );

  const fieldError = (field: Field) =>
    errors[field] ? t[errors[field]!] : undefined;

  return (
    <section className="inq inquiry-form" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`}>{t.title}</h2>
      <p className="muted">
        {t.context} <strong>{storeName}</strong>
      </p>
      <form ref={form} onSubmit={submit} noValidate aria-busy={sending}>
        <p id={`${id}-required`} className="muted">
          {t.allRequired}
        </p>
        <fieldset
          disabled={sending || pending.current !== null}
          aria-describedby={`${id}-required`}
        >
          <label htmlFor={`${id}-name`}>
            <span>{t.name} *</span>
            <input
              id={`${id}-name`}
              name="visitor_name"
              value={name}
              maxLength={200}
              autoComplete="name"
              enterKeyHint="next"
              required
              aria-required="true"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? `${id}-name-error` : undefined}
              onChange={(event) => {
                setName(event.target.value);
                setErrors((previous) => ({ ...previous, name: undefined }));
              }}
            />
            {errors.name && (
              <small id={`${id}-name-error`} className="err" role="alert">
                {fieldError("name")}
              </small>
            )}
          </label>

          <label htmlFor={`${id}-contact`}>
            <span>{t.contact} *</span>
            <input
              id={`${id}-contact`}
              name="contact"
              value={contact}
              maxLength={400}
              autoComplete="off"
              inputMode="text"
              enterKeyHint="next"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
              aria-required="true"
              aria-invalid={!!errors.contact}
              aria-describedby={
                errors.contact
                  ? `${id}-contact-hint ${id}-contact-error`
                  : `${id}-contact-hint`
              }
              onChange={(event) => {
                setContact(event.target.value);
                setErrors((previous) => ({ ...previous, contact: undefined }));
              }}
            />
            <small id={`${id}-contact-hint`} className="muted">
              {t.contactHint}
            </small>
            {errors.contact && (
              <small id={`${id}-contact-error`} className="err" role="alert">
                {fieldError("contact")}
              </small>
            )}
          </label>

          <label htmlFor={`${id}-message`}>
            <span>{t.message} *</span>
            <textarea
              id={`${id}-message`}
              name="message"
              rows={4}
              value={message}
              maxLength={4000}
              required
              aria-required="true"
              aria-invalid={!!errors.message}
              aria-describedby={
                errors.message ? `${id}-message-error` : undefined
              }
              onChange={(event) => {
                setMessage(event.target.value);
                setErrors((previous) => ({ ...previous, message: undefined }));
              }}
            />
            {errors.message && (
              <small id={`${id}-message-error`} className="err" role="alert">
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
        <Button type="submit" disabled={sending} aria-busy={sending}>
          {sending ? t.sending : failure === "unknown" ? t.retry : t.send}
        </Button>
      </form>
    </section>
  );
}
