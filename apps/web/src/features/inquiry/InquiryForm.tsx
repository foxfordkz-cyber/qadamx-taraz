import { useRef, useState, type FormEvent } from 'react';
import { postInquiry } from '../explore/api';
import { useT, type Key } from '../explore/i18n';
import type { InquiryResult } from '../explore/types';

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

type Errors = Partial<Record<'contact' | 'message', Key>>;

// Клиентская проверка дополняет серверную; лимиты согласовать с контрактом
function validate(contact: string, message: string): Errors {
  const e: Errors = {};
  if (!contact.trim()) e.contact = 'required';
  else if (contact.trim().length < 5) e.contact = 'too_short';
  else if (contact.length > 120) e.contact = 'too_long';
  if (!message.trim()) e.message = 'required';
  else if (message.trim().length < 5) e.message = 'too_short';
  else if (message.length > 1000) e.message = 'too_long';
  return e;
}

export default function InquiryForm({ businessId }: { businessId: string }) {
  const { t } = useT();
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [done, setDone] = useState<InquiryResult | null>(null);
  // Один id на заявку: сетевой повтор не создаст дубль на сервере
  const requestId = useRef(newId());

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (sending) return;
    const err = validate(contact, message);
    setErrors(err);
    if (Object.keys(err).length) return;
    setSending(true);
    setFailed(false);
    try {
      const res = await postInquiry(businessId, {
        client_request_id: requestId.current,
        contact: contact.trim(),
        message: message.trim(),
        name: name.trim() || undefined,
      });
      setDone(res); // форму очищаем только после ответа
    } catch {
      setFailed(true); // введённый текст остаётся
    } finally {
      setSending(false);
    }
  };

  if (done)
    return (
      <section className="inq inq--ok" aria-live="polite">
        <h2>{t('sent_title')}</h2>
        <p>{t('request_no')}: <strong>{done.number ?? done.id}</strong></p>
        <p className="muted">{t('sent_text')}</p>
        <button
          type="button" className="btn"
          onClick={() => {
            requestId.current = newId();
            setDone(null); setName(''); setContact(''); setMessage('');
          }}
        >
          {t('send_another')}
        </button>
      </section>
    );

  return (
    <section className="inq" aria-labelledby="inq-h">
      <h2 id="inq-h">{t('inquiry')}</h2>
      <form onSubmit={submit} noValidate>
        <label>
          {t('name')}
          <input value={name} maxLength={80} autoComplete="name" onChange={(e) => setName(e.target.value)} />
        </label>

        <label>
          {t('contact')}
          <input
            value={contact} maxLength={120} autoComplete="tel" inputMode="text"
            aria-required="true" aria-invalid={!!errors.contact} aria-describedby="contact-hint"
            onChange={(e) => setContact(e.target.value)}
          />
          <small id="contact-hint" className="muted">{t('contact_hint')}</small>
          {errors.contact && <small className="err" role="alert">{t(errors.contact)}</small>}
        </label>

        <label>
          {t('message')}
          <textarea
            rows={4} value={message} maxLength={1000}
            aria-required="true" aria-invalid={!!errors.message}
            onChange={(e) => setMessage(e.target.value)}
          />
          {errors.message && <small className="err" role="alert">{t(errors.message)}</small>}
        </label>

        {failed && <p className="err" role="alert">{t('send_error')}</p>}
        <button className="btn btn--primary" type="submit" disabled={sending} aria-busy={sending}>
          {sending ? t('sending') : t('send')}
        </button>
      </form>
    </section>
  );
}
