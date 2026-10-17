/** Public shop page: only API data, honest demo marking, no internal ids. Synthetic API. */
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../shared/i18n";

const api = vi.hoisted(() => ({
  getBusiness: vi.fn(),
  getVenues: vi.fn(),
  postInquiry: vi.fn(),
}));
vi.mock("../features/explore/api", () => api);
import ShopPage from "../features/explore/ShopPage";

const venueId = "e4b1e55f-44a2-5296-a4e0-864a85173eff";
const shop = {
  id: "ad6203bc-7320-5b36-982b-135504c5af68",
  venue_id: venueId,
  venue_slug: "mart",
  slug: "mart-demo-clothes",
  name: "Учебная точка",
  category: "clothes",
  description: "Учебная точка, не подтверждённый партнёр площадки.",
  is_demo: true,
  catalog: [
    {
      id: "c1",
      business_id: "ad6203bc-7320-5b36-982b-135504c5af68",
      name: "Учебный товар",
      price_minor: 300000,
      available: true,
      is_demo: true,
    },
    {
      id: "c2",
      business_id: "ad6203bc-7320-5b36-982b-135504c5af68",
      name: "Второй товар",
      price_minor: null,
      available: false,
      is_demo: true,
    },
  ],
};
const venue = {
  id: venueId,
  slug: "mart",
  name: "MART",
  categories: ["clothes"],
  asset: {
    hotspots: [
      {
        id: "h1",
        business_id: "other",
        business_slug: "other",
        position: [0, 0, 0],
      },
      {
        id: "h2",
        business_id: shop.id,
        business_slug: shop.slug,
        position: [0, 0, 0],
      },
    ],
  },
};
beforeEach(() => {
  api.getBusiness.mockReset().mockResolvedValue(shop);
  api.getVenues.mockReset().mockResolvedValue([venue]);
  api.postInquiry.mockReset().mockResolvedValue({
    id: "70000000-0000-4000-8000-000000000001",
    created_at: "2026-10-17T10:00:00Z",
  });
});
afterEach(cleanup);

function renderShop() {
  render(
    <I18nProvider>
      <MemoryRouter initialEntries={["/shops/mart-demo-clothes"]}>
        <Routes>
          <Route path="/shops/:slug" element={<ShopPage />} />
        </Routes>
      </MemoryRouter>
    </I18nProvider>,
  );
}

describe("Страница магазина", () => {
  it("shows venue, point on the scheme, stock and demo marks from the API only", async () => {
    renderShop();
    expect(
      await screen.findByRole("heading", { level: 1, name: "Учебная точка" }),
    ).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "MART" })).toHaveAttribute(
      "href",
      "/venues/mart",
    );
    expect(screen.getByText(/точка 2 на схеме/)).toBeInTheDocument();
    expect(screen.getAllByText("Учебная точка").length).toBeGreaterThan(1);
    expect(screen.getByText("Учебные данные")).toBeInTheDocument();
    expect(screen.getByText("В наличии")).toBeInTheDocument();
    expect(screen.getByText("Нет в наличии")).toBeInTheDocument();
    expect(screen.getByText("3 000 ₸")).toBeInTheDocument();
    expect(screen.getByText("Уточнить")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Написать продавцу" }),
    ).toHaveAttribute("href", "#inquiry");
  });

  it("does not mark live data as demo", async () => {
    api.getBusiness.mockResolvedValue({
      ...shop,
      is_demo: false,
      catalog: shop.catalog.map((i) => ({ ...i, is_demo: false })),
    });
    renderShop();
    await screen.findByRole("heading", { level: 1 });
    expect(screen.queryByText("Учебные данные")).not.toBeInTheDocument();
    expect(screen.getAllByText("Учебная точка")).toHaveLength(1);
  });

  it("puts the name error next to the field and hides the request id after sending", async () => {
    renderShop();
    await screen.findByRole("heading", { level: 1 });
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "Отправить заявку" })),
    );
    const nameField = screen.getByLabelText(/Имя посетителя/);
    expect(nameField).toHaveAttribute("aria-invalid", "true");
    expect(document.getElementById("name-error")).toHaveTextContent(
      "Заполните поле",
    );
    expect(nameField).toHaveAttribute("aria-describedby", "name-error");
    expect(screen.getByLabelText("Имя посетителя")).toBe(nameField);
    expect(screen.getAllByText("Заполните поле")).toHaveLength(3);
    fireEvent.change(nameField, { target: { value: "Әсел" } });
    fireEvent.change(screen.getByLabelText(/Контакт/), {
      target: { value: "@qadam_test" },
    });
    fireEvent.change(screen.getByLabelText(/Сообщение/), {
      target: { value: "Есть этот товар?" },
    });
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "Отправить заявку" })),
    );
    expect(
      await screen.findByRole("heading", { name: "Заявка отправлена" }),
    ).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("70000000-0000");
  });
});
