import type { Locale } from "./i18n";
/** Digits for tenge: kk-KZ grouping is "12 500,5" like ru-KZ, but Chrome ships
    no kk-KZ number data and prints "12,500", so both languages use ru-KZ. */
const NUMBER_LOCALE: Record<Locale, string> = { ru: "ru-KZ", kk: "ru-KZ" };
/** Input is integer tiyn, NOT tenge. Keeps meaningful fractional tiyn. */
export function formatKZT(minor: number, locale: Locale = "ru"): string {
  if (!Number.isSafeInteger(minor))
    throw new RangeError("Expected safe integer minor units");
  const amount = new Intl.NumberFormat(NUMBER_LOCALE[locale], {
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
