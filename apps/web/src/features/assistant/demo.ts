import type { AssistantResponse, AssistantRequest } from "./model";

/** A fixed, explicitly labelled teaching example; never used after a live error. */
export function assistantDemo(
  businessId: string,
  request: AssistantRequest,
): AssistantResponse {
  const kk = request.locale === "kk";
  const customer = "33333333-3333-4333-8333-333333333333";
  return {
    business_id: businessId,
    days: request.days,
    locale: request.locale,
    timezone: "Asia/Almaty",
    currency: "KZT",
    as_of: "2026-10-16T10:00:00Z",
    source: "fallback",
    answer: kk
      ? "Оқу мысалы: Асқардың қарызы — 1 500 ₸. Оған сыпайы еске салу мәтінін көшіріп алуға болады. Бұл таңдалған кезеңнің есебі емес."
      : "Учебный пример: Асқар должен 1 500 ₸. Можно скопировать вежливое напоминание. Это пример ответа, а не отчёт за выбранный период.",
    facts: [
      {
        key: "debtor",
        label: kk ? "Асқар · мысал" : "Асқар · пример",
        value_minor: 150000,
        count: null,
        customer_id: customer,
      },
    ],
    actions: [
      { kind: "open_debts", customer_id: null, text: null },
      {
        kind: "reminder_draft",
        customer_id: customer,
        text: kk
          ? "Асқар, сәлеметсіз бе! 1 500 ₸ қарызыңыз туралы еске салғым келеді. Қашан төлей алатыныңызды хабарласаңыз. Рақмет!"
          : "Асқар, здравствуйте! Напоминаю об остатке 1 500 ₸. Подскажите, пожалуйста, когда вам будет удобно оплатить. Спасибо!",
      },
    ],
  };
}
