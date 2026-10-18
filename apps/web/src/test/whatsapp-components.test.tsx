import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import examples from "../../../../packages/contracts/examples.json";
import { reminderText, whatsappUrl } from "../shared/whatsapp";
import {
  customer,
  defaultFetch,
  ids,
  json,
  renderQa,
  session,
} from "./qa-fixtures";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
const draftText =
  "Асқар, здравствуйте! Остаток 1 500 ₸. Подскажите удобное время оплаты.";
function setup(
  route = "/seller/debts",
  contact: string | null = "+7 (701) 123-45-67",
) {
  vi.stubEnv("VITE_CUSTOMER_IDS_ENABLED", "true");
  vi.stubEnv("VITE_ASSISTANT_ENABLED", "true");
  const fetcher = vi.fn<typeof fetch>(async (input, init) => {
    const url = new URL(String(input));
    const b = url.pathname.split("/businesses/")[1]?.split("/")[0];
    if (url.pathname.endsWith("/summary"))
      return json({
        sales_minor: 0,
        receipts_minor: 0,
        outstanding_minor: 999900,
        new_inquiries_count: 0,
      });
    if (url.pathname.endsWith("/operations"))
      return json({
        items:
          b === ids.shopA
            ? [
                {
                  id: "30000000-0000-4000-8000-000000000001",
                  customer_id: ids.customer,
                  description: "Учебная продажа",
                  total_minor: 300000,
                  received_minor: 100000,
                  balance_minor: 150000,
                  created_at: "2026-10-18T05:00:00Z",
                },
              ]
            : [],
        next_cursor: null,
      });
    if (url.pathname.endsWith("/customers"))
      return json({
        items:
          b === ids.shopA
            ? [
                {
                  ...customer(ids.shopA, "Асқар"),
                  contact,
                  balance_minor: 900000,
                },
              ]
            : [],
        next_cursor: null,
      });
    if (url.pathname.endsWith("/assistant")) {
      const r = structuredClone(examples.AssistantResponse);
      r.business_id = ids.shopA;
      r.facts = [
        {
          key: "debtor",
          label: "Асқар",
          customer_id: ids.customer,
          value_minor: 150000,
        },
      ];
      r.actions = [
        { kind: "reminder_draft", customer_id: ids.customer, text: draftText },
      ];
      return json(r);
    }
    return defaultFetch(input, init);
  });
  return renderQa({ route, fetcher });
}
const writes = (fetcher: ReturnType<typeof setup>["fetcher"]) =>
  fetcher.mock.calls.filter(
    ([url, init]) =>
      init?.method === "POST" && !String(url).endsWith("/assistant"),
  );

describe("WhatsApp links in the actual seller components", () => {
  for (const locale of ["ru", "kk"] as const) {
    it(`uses the server sale balance, resolved name and point for debts in ${locale}`, async () => {
      const view = setup();
      await screen.findByRole("heading", { name: "Асқар" });
      if (locale === "kk")
        await userEvent.click(
          screen.getByRole("button", { name: "KZ" }),
        );
      const link = await screen.findByRole("link", {
        name:
          locale === "ru"
            ? "Напомнить в WhatsApp"
            : "WhatsApp арқылы еске салу",
      });
      expect(link).toHaveAttribute(
        "href",
        whatsappUrl(
          reminderText("Асқар", 150000, "QA MART", locale),
          "+77011234567",
        ),
      );
      expect(link).toHaveAttribute("target", "_blank");
      expect(link.getAttribute("rel")).toContain("noopener");
      expect(
        screen.getByText(
          locale === "ru"
            ? "Сообщение отправляете вы сами из WhatsApp"
            : "Хабарды WhatsApp-тан өзіңіз жібересіз",
        ),
      ).toBeVisible();
      expect(
        view.fetcher.mock.calls.filter(([url]) =>
          String(url).endsWith("/assistant"),
        ),
      ).toHaveLength(0);
      expect(writes(view.fetcher)).toEqual([]);
    });
  }
  it.each(["+77011234567", null])(
    "keeps the assistant draft text and resolves its exact customer contact %s",
    async (contact) => {
      const view = setup("/seller", contact);
      await userEvent.click(
        await screen.findByRole("button", { name: /Спросите Qadam/ }),
      );
      const dialog = await screen.findByRole("dialog");
      await userEvent.click(
        within(dialog).getByRole("button", {
          name: "Напиши напоминание о долге",
        }),
      );
      const link = await within(dialog).findByRole("link", {
        name: "Отправить в WhatsApp",
      });
      await waitFor(() =>
        expect(link).toHaveAttribute("href", whatsappUrl(draftText, contact)),
      );
      expect(
        within(dialog).getByRole("button", { name: "Скопировать" }),
      ).toBeVisible();
      expect(writes(view.fetcher)).toEqual([]);
    },
  );
  it("removes A's links immediately when the account changes to B", async () => {
    const view = setup();
    await screen.findByRole("heading", { name: "Асқар" });
    expect(
      screen.getByRole("link", { name: "Напомнить в WhatsApp" }),
    ).toHaveAttribute("href", expect.stringContaining("77011234567"));
    await act(async () => view.mock.emit(session(ids.b)));
    await waitFor(() =>
      expect(
        screen.queryByRole("link", { name: "Напомнить в WhatsApp" }),
      ).not.toBeInTheDocument(),
    );
    expect(view.container.innerHTML).not.toContain("77011234567");
  });
  it("supports demo debts without HTTP and keeps the second demo point empty", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => {
      throw new Error("No network in Demo");
    });
    const view = renderQa({ initial: null, route: "/login", fetcher });
    await userEvent.click(
      await screen.findByRole("button", { name: "Посмотреть демо" }),
    );
    await screen.findByRole("heading", { name: "Хорошего рабочего дня!" });
    await userEvent.click(
      screen.getByRole("link", { name: "Все долги" }),
    );
    const links = await screen.findAllByRole("link", {
      name: "Напомнить в WhatsApp",
    });
    expect(links).toHaveLength(3);
    await waitFor(() =>
      expect(links[0]).toHaveAttribute(
        "href",
        whatsappUrl(reminderText("Асқар", 1800000, "Qadam · Демо", "ru")),
      ),
    );
    await userEvent.selectOptions(
      screen.getByLabelText("Торговая точка"),
      "22222222-2222-4222-8222-222222222222",
    );
    expect(
      screen.queryByRole("link", { name: "Напомнить в WhatsApp" }),
    ).not.toBeInTheDocument();
    expect(view.fetcher).not.toHaveBeenCalled();
  });
});
