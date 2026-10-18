/** Home page purpose: the hero says what Qadam is, the seller cabinet is the main
 * action, three steps explain the flow, and Mal bazar stays a compact pointer. */
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../shared/i18n";

const api = vi.hoisted(() => ({
  getVenues: vi.fn(),
  getBusinesses: vi.fn(),
  getMalBazarAsset: vi.fn(),
}));
vi.mock("../features/explore/api", () => api);
import ExplorePage from "../features/explore/ExplorePage";

beforeEach(() => {
  api.getVenues.mockReset().mockResolvedValue([]);
  api.getBusinesses.mockReset().mockResolvedValue([]);
  api.getMalBazarAsset.mockReset();
});
afterEach(cleanup);

function renderHome() {
  render(
    <I18nProvider>
      <MemoryRouter initialEntries={["/"]}>
        <ExplorePage />
      </MemoryRouter>
    </I18nProvider>,
  );
}

describe("Главная: цель продукта", () => {
  it("names the product in the hero, with the cabinet first and the shop search second", () => {
    renderHome();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Qadam — учёт продаж и долгов голосом",
    );
    expect(
      screen.getByText(
        "Скажите о продаже на русском или казахском — AI подготовит запись, а долг посчитается сам.",
      ),
    ).toBeInTheDocument();
    const actions = within(
      screen.getByRole("heading", { level: 1 }).parentElement as HTMLElement,
    ).getAllByRole("link");
    expect(actions.map((link) => link.getAttribute("href"))).toEqual([
      "/seller",
      "#venues",
    ]);
    expect(actions[0]).toHaveAccessibleName("Кабинет продавца");
    expect(actions[1]).toHaveAccessibleName("Найти магазин");
    // The header no longer repeats the shop search link.
    expect(screen.getAllByRole("link", { name: "Найти магазин" })).toHaveLength(
      1,
    );
  });

  it("explains the flow in three ordered steps without new figures", () => {
    renderHome();
    const steps = within(
      screen.getByRole("region", { name: "Как это работает" }),
    ).getAllByRole("listitem");
    expect(
      steps.map((step) => within(step).getByRole("heading").textContent),
    ).toEqual(["Скажите", "Проверьте", "Долг посчитан"]);
    expect(steps[1]).toHaveTextContent(
      "Запись сохранится только после вашего подтверждения.",
    );
    expect(
      screen.getByRole("region", { name: "Как это работает" }).textContent,
    ).not.toMatch(/₸|\d/);
  });

  it("switches the hero and the steps to Kazakh", () => {
    renderHome();
    fireEvent.click(screen.getByRole("button", { name: "KZ" }));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Qadam — сату мен қарызды дауыспен есепке алу",
    );
    expect(
      screen.getByRole("link", { name: "Сатушы кабинеті" }),
    ).toHaveAttribute("href", "/seller");
    expect(
      within(screen.getByRole("region", { name: "Қалай жұмыс істейді" }))
        .getAllByRole("heading", { level: 3 })
        .map((h) => h.textContent),
    ).toEqual(["Айтыңыз", "Тексеріңіз", "Қарыз есептелді"]);
  });

  it("keeps Mal bazar compact: concept mark and links, no poster on the home page", () => {
    renderHome();
    const mal = screen.getByRole("region", { name: "Мал базар" });
    expect(
      within(mal).getByText("Концепт-модель · место не подтверждено"),
    ).toBeInTheDocument();
    expect(
      within(mal).getByRole("link", { name: /Открыть страницу Мал базара/ }),
    ).toHaveAttribute("href", "/venues/mal-bazar");
    expect(within(mal).queryByRole("img")).toBeNull();
    expect(api.getMalBazarAsset).not.toHaveBeenCalled();
  });
});
