import type { Locale } from "./i18n";
/** Input is integer tiyn, NOT tenge. Keeps meaningful fractional tiyn. */
export function formatKZT(minor: number, locale: Locale = "ru"): string {
  if (!Number.isSafeInteger(minor))
    throw new RangeError("Expected safe integer minor units");
  const amount = new Intl.NumberFormat(locale === "kk" ? "kk-KZ" : "ru-KZ", {
    minimumFractionDigits: minor % 100 ? 2 : 0,
    maximumFractionDigits: 2,
  })
    .format(minor / 100)
    .replace(/[\u00a0\u202f]/g, " ");
  return `${amount} ₸`;
}
export function formatDate(value: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "kk" ? "kk-KZ" : "ru-KZ", {
    timeZone: "Asia/Almaty",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
