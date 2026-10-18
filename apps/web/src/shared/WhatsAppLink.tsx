import { useId } from "react";
import { useI18n } from "./i18n";
import { whatsappUrl } from "./whatsapp";
import "./whatsapp.css";

export function WhatsAppLink({
  text,
  contact,
  reminder = false,
}: {
  text: string;
  contact?: string | null;
  reminder?: boolean;
}) {
  const { t } = useI18n();
  const hint = useId();
  return (
    <div className="whatsapp-reminder">
      <a
        className="button button-secondary whatsapp-reminder-link"
        href={whatsappUrl(text, contact)}
        target="_blank"
        rel="noopener noreferrer"
        aria-describedby={hint}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M20 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20l1.1-4.4A8.5 8.5 0 1 1 20 11.5Z" />
          <path d="M8 7.5c-.8 3.5 2.5 6.8 6 7l1.2-1.8-2-1-1 1a6 6 0 0 1-2.9-2.9l1-1-1-2Z" />
        </svg>
        <span>{t(reminder ? "whatsappRemind" : "whatsappSend")}</span>
      </a>
      <small id={hint}>{t("whatsappHint")}</small>
    </div>
  );
}
