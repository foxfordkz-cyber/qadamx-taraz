import { formatKZT } from "./format";
import type { Locale } from "./i18n";

export function reminderText(
  name: string,
  amountMinor: number,
  shopName: string,
  locale: Locale,
): string {
  const amount = formatKZT(amountMinor, locale);
  return locale === "kk"
    ? `Сәлеметсіз бе, ${name}! «${shopName}» дүкеніндегі ${amount} қалдықты еске саламын. Қашан төлеу ыңғайлы болатынын айтыңызшы. Рақмет!`
    : `Здравствуйте, ${name}! Напоминаю об остатке ${amount} в магазине «${shopName}». Подскажите, пожалуйста, когда вам будет удобно оплатить. Спасибо!`;
}

/** Only explicit +7/8 phone candidates; never turn arbitrary contact digits into a recipient. */
export function whatsappUrl(text: string, contact?: string | null): string {
  const candidates = (contact ?? "").matchAll(
    /(?:^|[^\p{L}\p{N}@+])((?:\+7|8)(?:[ ()\u00a0\u202f.-]*\d){10})(?![\p{L}\p{N}@]|[ ()\u00a0\u202f.-]*\d)/gu,
  );
  const numbers = new Set(
    [...candidates].map((match) => `7${match[1].replace(/\D/g, "").slice(1)}`),
  );
  // Multiple different numbers are ambiguous: let the seller choose in WhatsApp.
  const phone = numbers.size === 1 ? [...numbers][0] : "";
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}
