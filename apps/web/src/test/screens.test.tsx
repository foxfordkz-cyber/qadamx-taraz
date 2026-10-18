import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../app/App";
import { AuthProvider } from "../app/auth";
import { makeQueryClient } from "../app/query";
import { I18nProvider } from "../shared/i18n";
import { demoGateway } from "../shared/demo/gateway";
import type { SellerGateway } from "../shared/api/gateway";
import { ApiError } from "../shared/api/client";
import { mockAuth } from "./qa-fixtures";

afterEach(() => vi.unstubAllEnvs());
async function openAuthenticated(gateway: SellerGateway) {
  vi.stubEnv("VITE_API_BASE_URL", "https://qa.invalid/api/v1");
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <I18nProvider>
        <AuthProvider client={mockAuth().client}>
          <MemoryRouter initialEntries={["/seller"]}>
            <App gateway={gateway} />
          </MemoryRouter>
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>,
  );
  await screen.findByRole("heading", { name: "Хорошего рабочего дня!" });
}

async function openDemo(gateway: SellerGateway = demoGateway) {
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <I18nProvider>
        <AuthProvider client={null}>
          <MemoryRouter initialEntries={["/login"]}>
            <App gateway={gateway} />
          </MemoryRouter>
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>,
  );
  await userEvent.click(
    screen.getByRole("button", { name: /Посмотреть демо/ }),
  );
  await screen.findByRole("heading", { name: "Хорошего рабочего дня!" });
}
async function goTo(name: string) {
  const direct = screen.queryAllByRole("link", { name })[0];
  if (direct) {
    await userEvent.click(direct);
    return;
  }
  await userEvent.click(screen.getByRole("button", { name: "Все разделы" }));
  await userEvent.click(
    within(screen.getByRole("dialog")).getByRole("link", { name }),
  );
}
describe("seller UI using explicitly injected test/demo gateways", () => {
  it("navigates through the mobile menu and closes it after selecting a section", async () => {
    await openDemo();
    const more = screen.getByRole("button", {
      name: "Все разделы",
    });
    await userEvent.click(more);
    const menu = screen.getByRole("dialog", { name: "Все разделы" });
    expect(
      within(menu).getByRole("link", { name: /Публичная витрина/ }),
    ).toHaveAttribute("href", "/");
    await userEvent.click(within(menu).getByRole("link", { name: "Каталог" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(await screen.findByText("15 000 ₸")).toBeInTheDocument();
    await userEvent.click(more);
    await userEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Закрыть",
      }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(more).toHaveFocus();
  });
  it("filters loaded catalog items locally and preserves filters across languages", async () => {
    const catalog = vi.fn(demoGateway.catalog);
    await openDemo({ ...demoGateway, catalog });
    await goTo("Каталог");
    await screen.findByText("15 000 ₸");
    await userEvent.type(screen.getByLabelText("Поиск по каталогу"), "рюкзак");
    await userEvent.selectOptions(
      screen.getByLabelText("Наличие"),
      "available",
    );
    expect(
      screen.getByRole("heading", { name: "Рюкзак · Демо" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Сөмке · Демо" }),
    ).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "KZ" }));
    expect(screen.getByLabelText("Каталогтан іздеу")).toHaveValue("рюкзак");
    expect(screen.getByLabelText("Қолжетімділік")).toHaveValue("available");
    expect(screen.getByText("15 000 ₸")).toBeInTheDocument();
    expect(catalog).toHaveBeenCalledTimes(1);
  });
  it("resets catalog search and availability after a no-results state", async () => {
    const catalog = vi.fn(demoGateway.catalog);
    await openDemo({ ...demoGateway, catalog });
    await goTo("Каталог");
    await screen.findByText("15 000 ₸");
    await userEvent.type(screen.getByLabelText("Поиск по каталогу"), "рюкзак");
    await userEvent.selectOptions(
      screen.getByLabelText("Наличие"),
      "unavailable",
    );
    expect(
      screen.getByRole("heading", { name: "Товары не найдены" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("15 000 ₸")).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Сбросить поиск и фильтры" }),
    );
    expect(screen.getByLabelText("Поиск по каталогу")).toHaveValue("");
    expect(screen.getByLabelText("Наличие")).toHaveValue("all");
    expect(screen.getByText("15 000 ₸")).toBeInTheDocument();
    expect(screen.getByText("Цена не указана")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Тауар · Демо" }),
    ).toBeInTheDocument();
    expect(catalog).toHaveBeenCalledTimes(1);
  });
  it("searches inquiry text locally and keeps the search across language changes", async () => {
    const inquiries = vi.fn(demoGateway.inquiries);
    await openDemo({ ...demoGateway, inquiries });
    await goTo("Заявки");
    await screen.findByRole("heading", { name: "Әсел · Демо" });
    await userEvent.type(
      screen.getByLabelText("Поиск по заявкам"),
      "Сәлеметсіз",
    );
    expect(
      screen.queryByRole("heading", { name: "Демо-покупатель" }),
    ).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "KZ" }));
    expect(screen.getByLabelText("Өтінімдерден іздеу")).toHaveValue(
      "Сәлеметсіз",
    );
    expect(inquiries).toHaveBeenCalledTimes(1);
  });
  it("filters inquiries locally and preserves the selected status across languages", async () => {
    const inquiries = vi.fn(demoGateway.inquiries);
    await openDemo({ ...demoGateway, inquiries });
    await goTo("Заявки");
    await screen.findByRole("heading", { name: "Әсел · Демо" });
    await userEvent.selectOptions(
      screen.getByLabelText("Показать заявки"),
      "in_progress",
    );
    expect(
      screen.queryByRole("heading", { name: "Әсел · Демо" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Демо-покупатель" }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "KZ" }));
    expect(screen.getByLabelText("Өтінімдерді көрсету")).toHaveValue(
      "in_progress",
    );
    expect(inquiries).toHaveBeenCalledTimes(1);
    await userEvent.click(
      screen.getByRole("button", { name: "Сүзгіні тазалау" }),
    );
    expect(screen.getByLabelText("Өтінімдерді көрсету")).toHaveValue("all");
  });
  it("does not claim no results in unrequested inquiry pages", async () => {
    const inquiries: SellerGateway["inquiries"] = async (business, cursor) => {
      const data = await demoGateway.inquiries(business, null);
      return cursor
        ? { items: [data.items[2]], next_cursor: null }
        : { items: [data.items[0]], next_cursor: "test-next" };
    };
    await openDemo({ ...demoGateway, inquiries });
    await goTo("Заявки");
    await screen.findByRole("heading", { name: "Әсел · Демо" });
    await userEvent.selectOptions(
      screen.getByLabelText("Показать заявки"),
      "closed",
    );
    expect(
      screen.getByText(/Фильтр применяется к загруженным заявкам/),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Показать ещё" }));
    expect(
      await screen.findByRole("heading", { name: "Демо-покупатель 02" }),
    ).toBeInTheDocument();
  });
  it("waits for the settled customer search and hides stale results", async () => {
    const customers = vi.fn(demoGateway.customers);
    await openDemo({ ...demoGateway, customers });
    await goTo("Клиенты");
    await screen.findAllByRole("heading", { name: "Асқар" });
    const search = screen.getByLabelText("Поиск по имени");
    await userEvent.click(search);
    await userEvent.paste("  Әсел  ");
    expect(screen.getByText("Ищем клиентов…")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Асқар" }),
    ).not.toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "Әсел" }),
    ).toBeInTheDocument();
    expect(customers.mock.calls.map((call) => call[1])).toEqual(["", "Әсел"]);
    await userEvent.click(
      screen.getByRole("button", { name: "Очистить поиск" }),
    );
    expect(
      await screen.findAllByRole("heading", { name: "Асқар" }),
    ).toHaveLength(2);
  });
  it("retains form fields when changing language and disables demo saves", async () => {
    await openDemo();
    await goTo("Клиенты");
    await userEvent.click(screen.getByRole("button", { name: /Новый клиент/ }));
    const dialog = screen.getByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText("Имя"), "Әсел");
    await userEvent.type(
      within(dialog).getByLabelText("Заметка"),
      "Павильон 9",
    );
    await userEvent.click(within(dialog).getByRole("button", { name: "KZ" }));
    expect(within(dialog).getByLabelText("Есімі")).toHaveValue("Әсел");
    expect(within(dialog).getByLabelText("Ескертпе")).toHaveValue("Павильон 9");
    expect(
      within(dialog).getByRole("button", { name: "Клиентті құру" }),
    ).toBeDisabled();
  });
  it("keeps duplicate names as distinct selectable customers", async () => {
    await openDemo();
    await goTo("Клиенты");
    await userEvent.click(
      screen.getByRole("button", { name: "Выбрать клиента" }),
    );
    const dialog = screen.getByRole("dialog");
    const choices = await within(dialog).findAllByRole("button", {
      name: /Асқар/,
    });
    expect(choices).toHaveLength(2);
    await userEvent.click(choices[1]);
    expect(
      screen.getByText(/Выбран: Асқар · Демо · доставка/),
    ).toBeInTheDocument();
  });
  it("shows empty states after selecting a different allowed business", async () => {
    await openDemo();
    await goTo("Каталог");
    expect(await screen.findByText("15 000 ₸")).toBeInTheDocument();
    await userEvent.selectOptions(
      screen.getByLabelText("Торговая точка"),
      "22222222-2222-4222-8222-222222222222",
    );
    expect(
      await screen.findByRole("heading", { name: "Здесь пока ничего нет" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("15 000 ₸")).not.toBeInTheDocument();
  });
  it.each([401, 403, 404, 409, 422, 429, 500])(
    "shows HTTP %i as error instead of empty/success",
    async (status) => {
      await openDemo({
        ...demoGateway,
        catalog: async () => {
          throw new ApiError(status, "TEST_ERROR");
        },
      });
      await goTo("Каталог");
      expect(
        await screen.findByRole(
          "heading",
          { name: "Не удалось загрузить данные" },
          { timeout: 3000 },
        ),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("heading", { name: "Здесь пока ничего нет" }),
      ).not.toBeInTheDocument();
    },
  );
  it("shows a support reference without rendering backend messages", async () => {
    const requestId = "70000000-0000-4000-8000-000000000001";
    await openDemo({
      ...demoGateway,
      catalog: async () => {
        throw new ApiError(403, "ACCESS_DENIED", { requestId });
      },
    });
    await goTo("Каталог");
    expect(
      await screen.findByText(`Код для поддержки: ${requestId}`),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "KZ" }));
    expect(screen.getByText(`Қолдау коды: ${requestId}`)).toBeInTheDocument();
  });
  it("preserves customer fields after a rejected write and allows optional contact", async () => {
    const create = vi.fn().mockRejectedValue(new ApiError(500, "TEST_ERROR"));
    await openAuthenticated({
      ...demoGateway,
      mode: "live",
      canWrite: true,
      createCustomer: create,
      customerCreationResult: async () => ({
        status: "not_observed",
        customer: null,
      }),
    });
    await goTo("Клиенты");
    await userEvent.click(screen.getByRole("button", { name: /Новый клиент/ }));
    const dialog = screen.getByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText("Имя"), "Test");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Создать клиента" }),
    );
    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create.mock.calls[0][1]).toEqual({
      display_name: "Test",
      note: "",
      contact: "",
    });
    expect(within(dialog).getByLabelText("Имя")).toHaveValue("Test");
    expect(
      within(dialog).queryByText("Клиент создан на сервере."),
    ).not.toBeInTheDocument();
  });
  it("selects a newly created customer through the shared picker (test gateway only)", async () => {
    const createCustomer = vi.fn<SellerGateway["createCustomer"]>(
      async (business, input) => ({
        ...input,
        id: "test-created-customer",
        business_id: business.id,
      }),
    );
    await openAuthenticated({
      ...demoGateway,
      mode: "live",
      canWrite: true,
      createCustomer,
      customerCreationResult: async () => ({
        status: "not_observed",
        customer: null,
      }),
    });
    await goTo("Клиенты");
    await userEvent.click(
      screen.getByRole("button", { name: "Выбрать клиента" }),
    );
    const dialog = screen.getByRole("dialog");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Новый клиент" }),
    );
    await userEvent.type(within(dialog).getByLabelText("Имя"), "Test created");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Создать клиента" }),
    );
    expect(await screen.findByText("Выбран: Test created")).toBeInTheDocument();
    expect(createCustomer).toHaveBeenCalledTimes(1);
  });
  it("updates inquiry display only after the mutation resolves", async () => {
    let release: () => void = () => {};
    let confirmed = false;
    const gateway: SellerGateway = {
      ...demoGateway,
      mode: "live",
      canWrite: true,
      inquiries: async (...args) => {
        const data = await demoGateway.inquiries(...args);
        if (confirmed) data.items[0].status = "closed";
        return data;
      },
      setInquiryStatus: async () =>
        new Promise<void>((resolve) => {
          release = () => {
            confirmed = true;
            resolve();
          };
        }),
    };
    await openDemo(gateway);
    await goTo("Заявки");
    const heading = await screen.findByRole("heading", { name: "Әсел · Демо" });
    const card = heading.closest("article")!;
    await userEvent.selectOptions(
      within(card).getByLabelText("Статус заявки"),
      "closed",
    );
    await userEvent.click(
      within(card).getByRole("button", { name: "Сохранить" }),
    );
    expect(card.querySelector(".badge")).toHaveTextContent("Новая");
    expect(
      within(card).getByRole("button", { name: "Сохранение…" }),
    ).toBeDisabled();
    release();
    await waitFor(() =>
      expect(
        screen
          .getByRole("heading", { name: "Әсел · Демо" })
          .closest("article")!
          .querySelector(".badge"),
      ).toHaveTextContent("Закрыта"),
    );
  });
});
