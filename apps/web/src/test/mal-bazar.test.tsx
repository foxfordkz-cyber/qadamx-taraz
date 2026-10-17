/** Mal bazar: a concept page beside the venues. No listings, stock or prices on the
 * web, an explicit concept mark, the app link and a poster without WebGL. */
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { I18nProvider } from "../shared/i18n";

const api = vi.hoisted(() => ({
  getMalBazarAsset: vi.fn(),
  getVenues: vi.fn(),
  getBusinesses: vi.fn(),
}));
vi.mock("../features/explore/api", () => api);
import VenueRoute from "../features/explore/VenuePage";
import { MalBazarSection } from "../features/explore/MalBazar";

// Transform the real Three.js module during setup. This test checks fallback UI,
// not the host machine's cold module compilation speed; do not mock the scene.
beforeAll(async () => {
  await import("../features/explore/VenueScene");
});

const asset = {
  slug: "mal-bazar",
  model_url: "/models/mal-bazar.glb",
  poster_url: "/previews/mal-bazar.webp",
  bounds_min: [-33, 0, -23],
  bounds_max: [33, 7.4, 23],
  camera_position: [9, 51, 62],
  camera_target: [0, 1.5, 0],
  camera_fov_degrees: 45,
  hotspots: [],
};

beforeEach(() => {
  api.getMalBazarAsset.mockReset().mockResolvedValue(asset);
  api.getVenues.mockReset().mockRejectedValue(new Error("not a venue"));
  api.getBusinesses.mockReset().mockRejectedValue(new Error("not a venue"));
});
afterEach(cleanup);

function renderAt(path: string) {
  render(
    <I18nProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/venues/:slug" element={<VenueRoute />} />
          <Route path="/" element={<MalBazarSection />} />
        </Routes>
      </MemoryRouter>
    </I18nProvider>,
  );
}

describe("Мал базар", () => {
  it("has its own concept page beside the venues, without venue or shop requests", async () => {
    renderAt("/venues/mal-bazar");
    expect(
      screen.getByRole("heading", { level: 1, name: "Мал базар" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Скотный рынок · концепт-модель, место не подтверждено"),
    ).toBeInTheDocument();
    // Without WebGL the scene falls back to the rendered poster. The scene is a
    // lazy chunk, which can take longer than the default wait in a full run.
    expect(
      await screen.findByRole(
        "img",
        { name: "Условная схема, не карта" },
        { timeout: 5000 },
      ),
    ).toHaveAttribute("src", "/previews/mal-bazar.webp");
    expect(api.getVenues).not.toHaveBeenCalled();
    expect(api.getBusinesses).not.toHaveBeenCalled();
  });

  it("explains what works and shows no listings, stock or prices", async () => {
    renderAt("/venues/mal-bazar");
    await screen.findByRole("heading", { name: "Что работает сейчас" });
    expect(
      screen.getByRole("heading", { name: "На сайте — без ленты и цен" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Животные на модели декоративные/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Открыть приложение для Android" }),
    ).toHaveAttribute(
      "href",
      "https://github.com/foxfordkz-cyber/qadamx-taraz/releases/tag/mobile-v0.5.2-review68.1",
    );
    expect(document.body.textContent).not.toMatch(/₸|Есть сегодня:|\d+ гол/);
  });

  it("keeps the poster when the concept model descriptor cannot be loaded", async () => {
    api.getMalBazarAsset.mockRejectedValue(new Error("offline"));
    renderAt("/venues/mal-bazar");
    expect(
      await screen.findByRole("img", {
        name: "Концепт-модель Мал базара: ворота, навес над проходом, загоны",
      }),
    ).toHaveAttribute("src", "/previews/mal-bazar.webp");
  });

  it("links the home section to the page and the app, with the concept mark", () => {
    renderAt("/");
    expect(
      screen.getByText("Концепт-модель · место не подтверждено"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Открыть страницу Мал базара/ }),
    ).toHaveAttribute("href", "/venues/mal-bazar");
    expect(
      screen.getByRole("link", { name: "Открыть приложение для Android" }),
    ).toHaveAttribute("target", "_blank");
  });
});
