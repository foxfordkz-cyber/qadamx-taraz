import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BusinessProvider, useBusiness } from "../app/runtime";
import { businessSelectionKey } from "../app/business-selection";
import { ids, meA, renderQa, session } from "./qa-fixtures";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
const key = businessSelectionKey(ids.a, "https://qa.invalid/api/v1");
function Probe() {
  const { business, selectBusiness } = useBusiness();
  return (
    <>
      <output>{business.id}</output>
      <button onClick={() => selectBusiness(ids.shopA2)}>second</button>
      <button onClick={() => selectBusiness(ids.shopB)}>foreign</button>
    </>
  );
}
function tree(businesses = meA.businesses, persistenceKey = key) {
  return (
    <BusinessProvider businesses={businesses} persistenceKey={persistenceKey}>
      <Probe />
    </BusinessProvider>
  );
}
describe("tab-local authorized business preference", () => {
  it("restores a selected membership after remount, storing only its ID", () => {
    const first = render(tree());
    fireEvent.click(screen.getByText("second"));
    expect(sessionStorage.getItem(key)).toBe(ids.shopA2);
    expect(localStorage.length).toBe(0);
    first.unmount();
    render(tree());
    expect(screen.getByRole("status")).toHaveTextContent(ids.shopA2);
  });
  it("rejects tampered/foreign IDs and ignores unauthorized selection", () => {
    sessionStorage.setItem(key, ids.shopB);
    render(tree());
    expect(screen.getByRole("status")).toHaveTextContent(ids.shopA);
    fireEvent.click(screen.getByText("foreign"));
    expect(sessionStorage.getItem(key)).toBe(ids.shopA);
  });
  it("drops revoked and empty memberships without resurrecting them", () => {
    sessionStorage.setItem(key, ids.shopA2);
    const view = render(tree());
    view.rerender(tree([meA.businesses[0]]));
    expect(sessionStorage.getItem(key)).toBe(ids.shopA);
    view.rerender(tree());
    expect(screen.getByRole("status")).toHaveTextContent(ids.shopA);
    view.rerender(tree([]));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(sessionStorage.getItem(key)).toBeNull();
  });
  it("separates identities and API environments, even when provider is reused", () => {
    sessionStorage.setItem(key, ids.shopA2);
    const view = render(tree());
    view.rerender(
      tree(
        meA.businesses,
        businessSelectionKey(ids.b, "https://qa.invalid/api/v1"),
      ),
    );
    expect(screen.getByRole("status")).toHaveTextContent(ids.shopA);
    view.rerender(
      tree(
        meA.businesses,
        businessSelectionKey(ids.a, "https://another.invalid/api/v1"),
      ),
    );
    expect(screen.getByRole("status")).toHaveTextContent(ids.shopA);
    view.rerender(tree());
    expect(screen.getByRole("status")).toHaveTextContent(ids.shopA2);
  });
  it("keeps working if browser storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    render(tree());
    fireEvent.click(screen.getByText("second"));
    expect(screen.getByRole("status")).toHaveTextContent(ids.shopA2);
  });
  it("restores only after /me across full App reload and A → B → A generations", async () => {
    const first = renderQa();
    const select = await screen.findByLabelText("Торговая точка");
    fireEvent.change(select, { target: { value: ids.shopA2 } });
    first.unmount();
    const next = renderQa();
    expect(await screen.findByLabelText("Торговая точка")).toHaveValue(
      ids.shopA2,
    );
    await act(async () => next.mock.emit(session(ids.b)));
    expect(await screen.findByLabelText("Торговая точка")).toHaveValue(
      ids.shopB,
    );
    expect(screen.queryByText("QA Кайкармет")).not.toBeInTheDocument();
    await act(async () => next.mock.emit(session()));
    expect(await screen.findByLabelText("Торговая точка")).toHaveValue(
      ids.shopA2,
    );
  });
});
