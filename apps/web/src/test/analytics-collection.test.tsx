import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { CollectionCards } from "../features/seller/analytics/CollectionCards";
import {
  makeDemoAnalyticsSnapshot,
  DEMO_ANALYTICS_BUSINESS as businessId,
  DEMO_ANALYTICS_EMPTY_BUSINESS,
} from "../features/seller/analytics/demo";
import {
  AnalyticsResponseError,
  readAnalyticsSnapshot,
  type AnalyticsSnapshot,
} from "../features/seller/analytics/model";
import { I18nProvider, type Locale } from "../shared/i18n";

function show(
  snapshot = makeDemoAnalyticsSnapshot(businessId, 7),
  locale: Locale = "ru",
) {
  localStorage.setItem("qadam.locale", locale);
  return render(
    <MemoryRouter>
      <I18nProvider>
        <CollectionCards snapshot={snapshot} demo remindersId="reminders" />
      </I18nProvider>
    </MemoryRouter>,
  );
}

describe("collection and debt aging presentation", () => {
  it.each(["ru", "kk"] as const)(
    "shows the same demo amounts, a rounded percentage and accessible bars in %s",
    (locale) => {
      show(undefined, locale);
      const collection = screen.getByRole("article", {
        name:
          locale === "ru"
            ? "Собираемость за период"
            : "Кезеңдегі жиналған ақша",
      });
      expect(collection).toHaveTextContent(
        locale === "ru" ? "Собрано 69%" : "69% жиналды",
      );
      expect(collection).toHaveTextContent("74 000 ₸");
      expect(collection).toHaveTextContent("51 000 ₸");
      const bar = within(collection).getByRole("img");
      for (const amount of ["43 000 ₸", "8 000 ₸", "23 000 ₸"])
        expect(bar).toHaveAccessibleName(expect.stringContaining(amount));
      const aging = screen.getByRole("article", {
        name: locale === "ru" ? "Возраст долгов" : "Қарыздардың мерзімі",
      });
      const bars = within(aging).getAllByRole("img");
      expect(bars).toHaveLength(3);
      for (const [index, amount] of [
        "23 000 ₸",
        "9 000 ₸",
        "3 000 ₸",
      ].entries())
        expect(bars[index]).toHaveAccessibleName(
          expect.stringContaining(amount),
        );
      expect(
        within(aging).getByText(locale === "ru" ? "1 продажа" : "1 сатылым"),
      ).toBeInTheDocument();
      expect(aging.querySelector(".is-overdue")).toHaveTextContent("3 000 ₸");
      expect(within(aging).getByRole("link")).toHaveAttribute(
        "href",
        "/seller/debts",
      );
      expect(
        screen.getAllByText(locale === "ru" ? "Демо-данные" : "Демо-деректер"),
      ).toHaveLength(2);
    },
  );

  it.each([
    [7_000_000, 4_000_000, 800_000, 69],
    [200, 1, 0, 1],
    [200, 0, 0, 0],
    [200, 100, 100, 100],
    [300, 100, 100, 67],
  ])(
    "rounds collection for %i/%i/%i to %i percent independently of period receipts",
    (sales, paid, later, percent) => {
      const snapshot = makeDemoAnalyticsSnapshot(businessId, 7);
      snapshot.cards.receipts_minor = -100_000;
      snapshot.collection = {
        sales_minor: sales,
        paid_at_sale_minor: paid,
        paid_later_minor: later,
        outstanding_minor: sales - paid - later,
      };
      show(snapshot);
      expect(screen.getByText(`Собрано ${percent}%`)).toBeInTheDocument();
    },
  );

  it.each(["ru", "kk"] as const)(
    "shows explicit zero states and no meaningless bars in %s",
    (locale) => {
      const view = show(
        makeDemoAnalyticsSnapshot(businessId, 7, "empty"),
        locale,
      );
      expect(
        screen.getByText(
          locale === "ru"
            ? "За период продаж не было"
            : "Кезеңде сатылым болған жоқ",
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          locale === "ru" ? "Открытых долгов нет" : "Өтелмеген қарыздар жоқ",
        ),
      ).toBeInTheDocument();
      expect(screen.queryByRole("img")).not.toBeInTheDocument();
      expect(view.container).not.toHaveTextContent(/NaN|Infinity|0%/);
    },
  );

  it.each([null, undefined])(
    "hides unavailable blocks (%s), without synthesizing them from receipts",
    (value) => {
      const snapshot = makeDemoAnalyticsSnapshot(businessId, 7);
      snapshot.collection = value;
      snapshot.debt_aging = value;
      const view = show(snapshot);
      expect(view.container).toBeEmptyDOMElement();
    },
  );

  it("shows each optional block independently and does not warn for a zero older bucket", () => {
    const snapshot = makeDemoAnalyticsSnapshot(businessId, 7);
    snapshot.collection = null;
    snapshot.debt_aging![2].amount_minor = 0;
    snapshot.debt_aging![2].sales_count = 0;
    const view = show(snapshot);
    expect(
      screen.queryByRole("article", { name: "Собираемость за период" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("article", { name: "Возраст долгов" }),
    ).toBeInTheDocument();
    expect(view.container.querySelector(".is-overdue")).toBeNull();
  });

  it("does not conflate a period without sales with old outstanding debt", () => {
    const snapshot = makeDemoAnalyticsSnapshot(businessId, 7);
    snapshot.collection = {
      sales_minor: 0,
      paid_at_sale_minor: 0,
      paid_later_minor: 0,
      outstanding_minor: 0,
    };
    show(snapshot);
    expect(screen.getByText("За период продаж не было")).toBeInTheDocument();
    expect(screen.queryByText("Открытых долгов нет")).not.toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Больше 30 дней: 3 000 ₸, 1 продажа" }),
    ).toBeInTheDocument();
  });
});

describe("optional analytics contract fields", () => {
  it.each([7, 30] as const)(
    "keeps both demo invariants for %i days",
    (days) => {
      const snapshot = makeDemoAnalyticsSnapshot(businessId, days);
      const collection = snapshot.collection!;
      expect(collection.sales_minor).toBe(snapshot.cards.sales_minor);
      expect(
        collection.paid_at_sale_minor +
          collection.paid_later_minor +
          collection.outstanding_minor,
      ).toBe(snapshot.cards.sales_minor);
      expect(
        snapshot.debt_aging!.reduce((sum, row) => sum + row.amount_minor, 0),
      ).toBe(snapshot.cards.outstanding_minor);
      expect(readAnalyticsSnapshot(snapshot, { businessId, days })).toEqual(
        snapshot,
      );
    },
  );

  it.each(["empty", "reversal"] as const)(
    "keeps zero collection and aging for demo %s",
    (scenario) => {
      const snapshot = makeDemoAnalyticsSnapshot(businessId, 7, scenario);
      expect(
        Object.values(snapshot.collection!).every((value) => value === 0),
      ).toBe(true);
      expect(
        snapshot.debt_aging!.every(
          (row) => row.amount_minor === 0 && row.sales_count === 0,
        ),
      ).toBe(true);
      expect(readAnalyticsSnapshot(snapshot, { businessId, days: 7 })).toEqual(
        snapshot,
      );
      const other = makeDemoAnalyticsSnapshot(
        DEMO_ANALYTICS_EMPTY_BUSINESS,
        30,
      );
      expect(other.collection!.sales_minor).toBe(0);
      expect(other.debt_aging!.every((row) => row.amount_minor === 0)).toBe(
        true,
      );
    },
  );

  it.each([null, undefined])(
    "accepts legacy responses with %s optional values",
    (value) => {
      const snapshot = makeDemoAnalyticsSnapshot(businessId, 7);
      snapshot.collection = value;
      snapshot.debt_aging = value;
      const read = readAnalyticsSnapshot(snapshot, { businessId, days: 7 });
      expect(read.cards).toEqual(snapshot.cards);
      expect(read.collection).toBe(value);
      expect(read.debt_aging).toBe(value);
    },
  );

  it.each([
    [
      "collection total",
      (v: AnalyticsSnapshot) => {
        v.collection!.paid_later_minor++;
      },
    ],
    [
      "collection scope",
      (v: AnalyticsSnapshot) => {
        v.collection!.sales_minor++;
      },
    ],
    [
      "negative collection",
      (v: AnalyticsSnapshot) => {
        v.collection!.paid_at_sale_minor = -1;
      },
    ],
    [
      "fractional collection",
      (v: AnalyticsSnapshot) => {
        v.collection!.paid_later_minor = 1.5;
      },
    ],
    [
      "aging total",
      (v: AnalyticsSnapshot) => {
        v.debt_aging![0].amount_minor++;
      },
    ],
    [
      "duplicate bucket",
      (v: AnalyticsSnapshot) => {
        v.debt_aging![1].key = "0_7";
      },
    ],
    [
      "missing bucket",
      (v: AnalyticsSnapshot) => {
        v.debt_aging!.pop();
      },
    ],
    [
      "invalid count",
      (v: AnalyticsSnapshot) => {
        v.debt_aging![0].sales_count = -1;
      },
    ],
    [
      "unsafe money",
      (v: AnalyticsSnapshot) => {
        v.debt_aging![0].amount_minor = Number.MAX_SAFE_INTEGER + 1;
      },
    ],
  ] as const)("rejects malformed new data: %s", (_, change) => {
    const snapshot = makeDemoAnalyticsSnapshot(businessId, 7);
    change(snapshot);
    expect(() =>
      readAnalyticsSnapshot(snapshot, { businessId, days: 7 }),
    ).toThrow(AnalyticsResponseError);
  });
});
