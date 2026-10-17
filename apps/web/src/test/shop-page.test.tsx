/** Public shop page: only API data, honest demo marking, form wiring. Synthetic API.
 * The inquiry form itself belongs to its own owner and is covered by inquiry.test.tsx. */
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../shared/i18n";

const api = vi.hoisted(() => ({
  getBusiness: vi.fn(),
  getVenues: vi.fn(),
}));
vi.mock("../features/explore/api", () => api);
vi.mock("../features/inquiry/InquiryForm", () => ({
  default: (props: { businessId: string; businessName: string }) => (
    <section
      data-testid="inquiry-form"
      data-business-id={props.businessId}
      data-business-name={props.businessName}
    />
  ),
}));
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
      screen.getByRole("link", { name: "Оставить заявку" }),
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

  it("wires the inquiry form with the current shop id and name", async () => {
    renderShop();
    const form = await screen.findByTestId("inquiry-form");
    expect(form).toHaveAttribute("data-business-id", shop.id);
    expect(form).toHaveAttribute("data-business-name", shop.name);
    expect(form.closest("#inquiry")).not.toBeNull();
  });
});
