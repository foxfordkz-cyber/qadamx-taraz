import { formatKZT } from "../../shared/format";
import type { Locale } from "../../shared/i18n";

export interface SummaryValues {
  sales: number;
  receipts: number;
  balance: number;
  inquiries: number;
}

// Feature-local copy: do not duplicate the shared WhatsApp work of another owner.
export const shareLabels = {
  ru: {
    heading: "Поделиться итогом дня",
    whatsapp: "Отправить итог в WhatsApp",
    copy: "Скопировать итог",
    native: "Поделиться",
    copied: "Итог скопирован",
    copyError: "Не удалось скопировать итог. Попробуйте ещё раз.",
    shareError:
      "Не удалось открыть меню «Поделиться». Используйте WhatsApp или копирование.",
    hint: "Вы сами выбираете получателя и подтверждаете отправку.",
    demo: "Учебный пример. Это не реальные итоги торговой точки.",
  },
  kk: {
    heading: "Күн қорытындысын бөлісу",
    whatsapp: "Қорытындыны WhatsApp-қа жіберу",
    copy: "Қорытындыны көшіру",
    native: "Бөлісу",
    copied: "Қорытынды көшірілді",
    copyError: "Қорытындыны көшіру мүмкін болмады. Қайта көріңіз.",
    shareError:
      "Бөлісу мәзірін ашу мүмкін болмады. WhatsApp не көшіруді қолданыңыз.",
    hint: "Алушыны өзіңіз таңдап, жіберуді растайсыз.",
    demo: "Оқу үлгісі. Бұл сауда нүктесінің нақты қорытындысы емес.",
  },
} as const;

export function summaryShareText({
  date,
  businessName,
  locale,
  summary,
}: {
  date: string;
  businessName: string;
  locale: Locale;
  summary: SummaryValues;
}): string {
  // The date input is already an Asia/Almaty calendar day. Never convert to UTC.
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!parts) throw new RangeError("Expected a summary calendar date");
  const day = `${parts[3]}.${parts[2]}`;
  const sales = formatKZT(summary.sales, locale);
  const receipts = formatKZT(summary.receipts, locale);
  const balance = formatKZT(summary.balance, locale);
  return (
    locale === "kk"
      ? [
          `${day} күн қорытындысы — ${businessName}`,
          `Сатылым: ${sales}`,
          `Түсім: ${receipts}`,
          `Маған қарыздар (барлығы): ${balance}`,
          `Жаңа өтінімдер: ${summary.inquiries}`,
          "— Qadam",
        ]
      : [
          `Итог дня ${day} — ${businessName}`,
          `Продажи: ${sales}`,
          `Получено: ${receipts}`,
          `Мне должны (всего): ${balance}`,
          `Новые заявки: ${summary.inquiries}`,
          "— Qadam",
        ]
  ).join("\n");
}

export function summaryWhatsAppUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
