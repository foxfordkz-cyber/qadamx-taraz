import { describe, expect, it } from "vitest";
import { reminderText, whatsappUrl } from "../shared/whatsapp";

describe("WhatsApp reminder text", () => {
  it("uses the agreed RU template and integer tiyn formatter", () => {
    expect(reminderText("Асқар", 150000, "Демо MART", "ru")).toBe(
      "Здравствуйте, Асқар! Напоминаю об остатке 1 500 ₸ в магазине «Демо MART». Подскажите, пожалуйста, когда вам будет удобно оплатить. Спасибо!",
    );
  });
  it("uses the agreed KZ template and preserves fractional tenge", () => {
    expect(reminderText("Әсел", 150055, "Оқу дүкені", "kk")).toBe(
      "Сәлеметсіз бе, Әсел! «Оқу дүкені» дүкеніндегі 1 500,55 ₸ қалдықты еске саламын. Қашан төлеу ыңғайлы болатынын айтыңызшы. Рақмет!",
    );
  });
  it("preserves names and shop text, including ampersands", () => {
    expect(reminderText("Әсел & Асқар", 100, "A&B", "ru")).toContain(
      "1 ₸ в магазине «A&B»",
    );
  });
  it("rejects non-integer money through the shared formatter", () => {
    expect(() => reminderText("A", 0.5, "B", "ru")).toThrow(RangeError);
  });
});

describe("WhatsApp URLs", () => {
  it.each([
    "+77011234567",
    "87011234567",
    "+7 (701) 123-45-67",
    "8 (701) 123 45 67",
    "Телефон: +7 701 123-45-67",
  ])("recognizes %s without leaking other contact text", (contact) => {
    expect(whatsappUrl("Сәлем, Асқар! 1 500 ₸ & +?", contact)).toBe(
      "https://wa.me/77011234567?text=" +
        encodeURIComponent("Сәлем, Асқар! 1 500 ₸ & +?"),
    );
  });
  it.each([
    undefined,
    null,
    "",
    "demo@example.test",
    "@87011234567",
    "87011234567@example.test",
    "+1 202 555 0123",
    "77011234567",
    "870112345678",
    "8 701 123 45 678",
    "+7 701 123 45",
    "code87011234567",
    "+77011234567 / +77017654321",
  ])(
    "uses the contact chooser for absent, invalid or ambiguous contact %s",
    (contact) => {
      expect(whatsappUrl("Қарыз: 500 ₸", contact)).toBe(
        "https://wa.me/?text=" + encodeURIComponent("Қарыз: 500 ₸"),
      );
    },
  );
  it("round trips Cyrillic, tenge, punctuation and newlines in the text query", () => {
    const text = "Әсел, привет! 1 500 ₸\nмагазин «A&B» #1?";
    const url = new URL(whatsappUrl(text, "8 (701) 123-45-67"));
    expect(url.searchParams.get("text")).toBe(text);
    expect([...url.searchParams.keys()]).toEqual(["text"]);
    expect(url.hash).toBe("");
  });
});
