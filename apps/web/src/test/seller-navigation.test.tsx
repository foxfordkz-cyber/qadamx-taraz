import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultFetch, ids, json, renderQa, session } from "./qa-fixtures";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function setup() {
  return renderQa({
    fetcher: vi.fn<typeof fetch>((input, init) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith(`/businesses/qa-${ids.shopA}`))
        return Promise.resolve(json({ id: ids.shopA, catalog: [] }));
      return defaultFetch(input, init);
    }),
  });
}
const primaryPaths = [
  "/seller",
  "/seller/sale",
  "/seller/debts",
  "/seller/analytics",
  "/seller/inquiries",
];
const secondaryPaths = [
  "/seller/customers",
  "/seller/catalog",
  "/seller/history",
  "/seller/summary",
];
const paths = (node: HTMLElement) =>
  within(node)
    .getAllByRole("link")
    .map((link) => link.getAttribute("href"));

describe("seller navigation priority", () => {
  it("keeps five main destinations in the same order on desktop and mobile", async () => {
    const view = setup();
    await screen.findByText("QA Клиент A");
    const desktop = view.container.querySelector<HTMLElement>(
      ".seller-primary-nav",
    )!;
    const mobile =
      view.container.querySelector<HTMLElement>(".seller-bottom-nav")!;
    expect(paths(desktop)).toEqual(primaryPaths);
    expect(paths(mobile)).toEqual(primaryPaths);
    expect(
      within(mobile)
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual(["Главная", "Продажа", "Мне должны", "Аналитика", "Заявки"]);
    expect(
      within(mobile).getByRole("button", { name: "Все разделы" }),
    ).toHaveTextContent("Ещё");
    expect(
      within(mobile).getByRole("button", { name: "Все разделы" }),
    ).toHaveClass("is-active");
    const secondary = view.container.querySelector<HTMLDetailsElement>(
      ".seller-secondary-nav",
    )!;
    expect(secondary.open).toBe(true);
    expect(paths(secondary)).toEqual(secondaryPaths);
  });

  it("groups only secondary tools under More and closes after a navigation", async () => {
    setup();
    await screen.findByText("QA Клиент A");
    const opener = screen.getByRole("button", { name: "Все разделы" });
    await userEvent.click(opener);
    const dialog = screen.getByRole("dialog", { name: "Все разделы" });
    expect(paths(dialog)).toEqual([...secondaryPaths, "/"]);
    expect(
      within(dialog).queryByRole("link", { name: "Продажа" }),
    ).not.toBeInTheDocument();
    await userEvent.click(
      within(dialog).getByRole("link", { name: "Каталог" }),
    );
    await screen.findByRole("heading", { name: "Каталог" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveAttribute("aria-expanded", "false");
  });

  it("restores focus to More after closing without navigating", async () => {
    setup();
    await screen.findByText("QA Клиент A");
    const opener = screen.getByRole("button", { name: "Все разделы" });
    await userEvent.click(opener);
    await userEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Закрыть",
      }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it("preserves language, permitted business selection and logout", async () => {
    const view = setup();
    await screen.findByText("QA Клиент A");
    await userEvent.selectOptions(
      screen.getByLabelText("Торговая точка"),
      ids.shopA2,
    );
    expect(screen.getByLabelText("Торговая точка")).toHaveValue(ids.shopA2);
    await userEvent.click(screen.getByRole("button", { name: "KZ" }));
    const mobile =
      view.container.querySelector<HTMLElement>(".seller-bottom-nav")!;
    expect(paths(mobile)).toEqual(primaryPaths);
    expect(
      within(mobile).getByRole("link", { name: "Басты бет" }),
    ).toBeInTheDocument();
    expect(
      within(mobile).getByRole("button", { name: "Барлық бөлімдер" }),
    ).toHaveTextContent("Тағы");
    act(() => view.mock.emit(session(ids.b)));
    await waitFor(() =>
      expect(screen.getByRole("combobox")).toHaveValue(ids.shopB),
    );
    expect(
      screen.queryByRole("option", { name: "QA MART" }),
    ).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "RU" }));
    await userEvent.click(screen.getByRole("button", { name: "Выйти" }));
    await waitFor(() => expect(view.mock.auth.signOut).toHaveBeenCalledOnce());
    expect(
      await screen.findByRole("button", { name: "Войти" }),
    ).toBeInTheDocument();
    expect(view.container.querySelector(".seller-bottom-nav")).toBeNull();
  });
});
