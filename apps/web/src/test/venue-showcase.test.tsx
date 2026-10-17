/** Home venue overview: the choice works without WebGL, the card and its link follow
 * the chosen venue, and nothing is invented beyond the API and the asset manifest. */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../shared/i18n";
import type { Venue, VenueAsset } from "../features/explore/types";

vi.mock("../features/explore/webgl", () => ({ hasWebGL: () => false }));
import { VenueShowcase } from "../features/explore/VenueShowcase";

const asset = (slug: string, points: number): VenueAsset => ({
  slug,
  model_url: `/models/${slug}.glb`,
  poster_url: `/previews/${slug}.webp`,
  bounds_min: [0, 0, 0],
  bounds_max: [1, 1, 1],
  camera_position: [2, 2, 2],
  camera_target: [0, 0, 0],
  camera_fov_degrees: 40,
  hotspots: Array.from({ length: points }, (_, i) => ({
    id: `${slug}-${i}`,
    business_slug: `${slug}-shop-${i}`,
    business_id: `${slug}-id-${i}`,
    position: [0, 0, 0],
  })),
});
const venue = (
  slug: string,
  name: string,
  extra: Partial<Venue> = {},
): Venue => ({
  id: `${slug}-venue`,
  slug,
  name,
  address_label: "",
  geometry_status: "conceptual",
  is_demo: true,
  categories: ["clothes", "food"],
  asset: asset(slug, 3),
  ...extra,
});
const venues = [
  venue("kaikarmet", "Кайкармет"),
  venue("mart", "MART", { is_demo: false, asset: asset("mart", 2) }),
  venue("auyl-bereke", "Ауыл Береке", { asset: undefined, categories: [] }),
];

afterEach(cleanup);

function renderShowcase() {
  render(
    <I18nProvider>
      <MemoryRouter>
        <VenueShowcase venues={venues} />
      </MemoryRouter>
    </I18nProvider>,
  );
}

describe("Обзор площадок на главной", () => {
  it("starts with the first venue and its poster when WebGL is unavailable", () => {
    renderShowcase();
    expect(screen.getByRole("button", { name: "Кайкармет" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      screen.getByRole("heading", { level: 3, name: "Кайкармет" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Кайкармет" })).toHaveAttribute(
      "src",
      "/previews/kaikarmet.webp",
    );
    expect(screen.getByRole("status")).toHaveTextContent("3D недоступно");
    expect(
      screen.queryByRole("button", { name: "Смотреть в 3D" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("01 / 03")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Открыть площадку/ }),
    ).toHaveAttribute("href", "/venues/kaikarmet");
  });

  it("switches the card, the point count and the link with the chosen venue", () => {
    renderShowcase();
    fireEvent.click(screen.getByRole("button", { name: "MART" }));
    expect(screen.getByRole("button", { name: "MART" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Кайкармет" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(
      screen.getByRole("heading", { level: 3, name: "MART" }),
    ).toBeInTheDocument();
    expect(screen.getByText("02 / 03")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Открыть площадку/ }),
    ).toHaveAttribute("href", "/venues/mart");
  });

  it("shows no point count or categories that the data does not have", () => {
    renderShowcase();
    fireEvent.click(screen.getByRole("button", { name: "Ауыл Береке" }));
    expect(
      screen.getByRole("heading", { level: 3, name: "Ауыл Береке" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Точек на схеме/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("list", { name: "Категории" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Открыть площадку/ }),
    ).toHaveAttribute("href", "/venues/auyl-bereke");
  });
});
