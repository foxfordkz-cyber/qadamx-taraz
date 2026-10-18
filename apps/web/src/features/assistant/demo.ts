import { demoDebtors } from "../../shared/demo/debts";
import { formatKZT } from "../../shared/format";
import {
  makeDemoAnalyticsSnapshot,
  demoPreviousSales,
} from "../seller/analytics/demo";
import type { AnalyticsSnapshot } from "../seller/analytics/model";
import type {
  AssistantResponse,
  AssistantRequest,
  AssistantFact,
} from "./model";

/** All demo answers use the same read-only snapshot as the cards and charts. */
export function assistantDemo(
  businessId: string,
  request: AssistantRequest,
  snapshot: AnalyticsSnapshot = makeDemoAnalyticsSnapshot(
    businessId,
    request.days,
  ),
): AssistantResponse {
  const kk = request.locale === "kk";
  const money = (value: number) => formatKZT(value, request.locale);
  const { cards } = snapshot;
  const debtors = cards.outstanding_minor > 0 ? demoDebtors : [];
  const amount = (
    key: AssistantFact["key"],
    label: string,
    value_minor: number,
  ): AssistantFact => ({
    key,
    label,
    value_minor,
    count: null,
    customer_id: null,
  });
  const previous = demoPreviousSales(snapshot);
  const today = snapshot.daily.at(-1)!;
  const facts: AssistantFact[] = [
    amount("sales", kk ? "Сатылымдар" : "Продажи", cards.sales_minor),
    amount("sales_previous", kk ? "Алдыңғы кезең" : "Прошлый период", previous),
    amount(
      "sales_change",
      kk ? "Өзгеріс" : "Изменение",
      cards.sales_minor - previous,
    ),
    amount("receipts", kk ? "Түсімдер" : "Поступления", cards.receipts_minor),
    amount(
      "outstanding",
      kk ? "Қазіргі қарыз" : "Мне должны сейчас",
      cards.outstanding_minor,
    ),
    amount(
      "today_sales",
      kk ? "Бүгінгі сатылымдар" : "Продажи сегодня",
      today.sales_minor,
    ),
    amount(
      "today_receipts",
      kk ? "Бүгінгі түсімдер" : "Поступления сегодня",
      today.receipts_minor,
    ),
    {
      key: "sales_count",
      label: kk ? "Сатылым саны" : "Количество продаж",
      count: cards.sales_count,
      value_minor: null,
      customer_id: null,
    },
    {
      key: "debtors",
      label: kk ? "Қарызы бар клиенттер" : "Должники",
      count: cards.debtors_count,
      value_minor: null,
      customer_id: null,
    },
    ...debtors.map((debtor) => ({
      key: "debtor" as const,
      label: kk ? debtor.nameKk : debtor.name,
      value_minor: debtor.value_minor,
      count: null,
      customer_id: debtor.customer_id,
    })),
  ];
  if (cards.average_ticket_minor !== null)
    facts.push(
      amount(
        "average_ticket",
        kk ? "Орташа чек" : "Средний чек",
        cards.average_ticket_minor,
      ),
    );
  const summary = kk
    ? `Кезеңдегі сатылымдар — ${money(cards.sales_minor)}, түсімдер — ${money(cards.receipts_minor)}. Қазіргі қарыз — ${money(cards.outstanding_minor)}. ${cards.sales_count} сатылым тіркелді.`
    : `За период продажи составили ${money(cards.sales_minor)}, поступления — ${money(cards.receipts_minor)}. Сейчас вам должны ${money(cards.outstanding_minor)}. Зафиксировано ${cards.sales_count} продаж.`;
  const question = request.question.toLocaleLowerCase();
  const reminder = /напиши|мәтінін жаз/.test(question);
  const debts = /больше всего|ең көп/.test(question);
  const todayQuestion = /сегодня|бүгін/.test(question);
  const debtor =
    debtors.find((item) =>
      question.includes((kk ? item.nameKk : item.name).toLocaleLowerCase()),
    ) ?? debtors[0];
  let answer = summary;
  const actions: AssistantResponse["actions"] = [];
  if (reminder && debtor) {
    const name = kk ? debtor.nameKk : debtor.name;
    answer = kk
      ? `${name} үшін еске салу дайын. Қарыз қалдығы — ${money(debtor.value_minor)}.`
      : `Напоминание для ${name} готово. Остаток долга — ${money(debtor.value_minor)}.`;
    actions.push({
      kind: "reminder_draft",
      customer_id: debtor.customer_id,
      text: kk
        ? `${name}, сәлеметсіз бе! ${money(debtor.value_minor)} қарызыңыз туралы еске салғым келеді. Қашан төлей алатыныңызды хабарласаңыз. Рақмет!`
        : `${name}, здравствуйте! Напоминаю об остатке ${money(debtor.value_minor)}. Подскажите, пожалуйста, когда вам будет удобно оплатить. Спасибо!`,
    });
  } else if (debts || reminder) {
    answer = debtor
      ? kk
        ? `Ең көп қарыз ${debtor.nameKk} клиентінде — ${money(debtor.value_minor)}. Барлық қарыз — ${money(cards.outstanding_minor)}.`
        : `Больше всего должен ${debtor.name} — ${money(debtor.value_minor)}. Всего вам должны ${money(cards.outstanding_minor)}.`
      : kk
        ? "Қарызы бар клиенттер жоқ."
        : "Клиентов с долгом нет.";
    actions.push({ kind: "open_debts", customer_id: null, text: null });
  } else if (todayQuestion) {
    answer = kk
      ? `Бүгінгі сатылымдар — ${money(today.sales_minor)}, түсімдер — ${money(today.receipts_minor)}. Күн әлі аяқталған жоқ. ${debtor ? `${debtor.nameKk} клиентіне ${money(debtor.value_minor)} қарызын еске салуға болады.` : "Жаңа сатылымдарды тіркеуді жалғастырыңыз."}`
      : `Сегодня продажи — ${money(today.sales_minor)}, поступления — ${money(today.receipts_minor)}. День ещё не завершён. ${debtor ? `Можно напомнить ${debtor.name} о долге ${money(debtor.value_minor)}.` : "Продолжайте фиксировать новые продажи."}`;
    actions.push({ kind: "open_debts", customer_id: null, text: null });
  }
  return {
    business_id: businessId,
    days: request.days,
    locale: request.locale,
    timezone: "Asia/Almaty",
    currency: "KZT",
    as_of: snapshot.as_of,
    source: "facts",
    answer,
    facts,
    actions,
  };
}
