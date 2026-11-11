import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { BusinessProvider, useBusiness } from "../app/runtime";
import type { Business } from "../shared/api/models";

const shops: Business[] = [
  { id: "A", name: "Shop A", slug: "a" },
  { id: "B", name: "Shop B", slug: "b" },
];
function Probe() {
  const { business, selectBusiness } = useBusiness();
  return (
    <>
      <output>{business.id}</output>
      <button onClick={() => selectBusiness("B")}>select B</button>
    </>
  );
}
function view(userId = "owner-a", businesses = shops) {
  return (
    <BusinessProvider businesses={businesses} userId={userId}>
      <Probe />
    </BusinessProvider>
  );
}
beforeEach(() => sessionStorage.clear());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  sessionStorage.clear();
});

it("restores the chosen shop after remount for the same account", () => {
  const page = render(view());
  fireEvent.click(screen.getByText("select B"));
  page.unmount();
  render(view());
  expect(screen.getByRole("status")).toHaveTextContent("B");
});
it("does not use another account's preference or in-memory selection", () => {
  const page = render(view());
  fireEvent.click(screen.getByText("select B"));
  page.rerender(view("owner-b"));
  expect(screen.getByRole("status")).toHaveTextContent("A");
  page.unmount();
  render(view("owner-b"));
  expect(screen.getByRole("status")).toHaveTextContent("A");
});
it("ignores tampered, foreign and revoked selections", () => {
  sessionStorage.setItem("qadam:selected-business:owner-a", "foreign");
  const page = render(view());
  expect(screen.getByRole("status")).toHaveTextContent("A");
  fireEvent.click(screen.getByText("select B"));
  page.rerender(view("owner-a", [shops[0]]));
  expect(screen.getByRole("status")).toHaveTextContent("A");
  fireEvent.click(screen.getByText("select B"));
  expect(screen.getByRole("status")).toHaveTextContent("A");
});
it("keeps working when browser storage is unavailable", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("denied");
  });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("denied");
  });
  render(view());
  fireEvent.click(screen.getByText("select B"));
  expect(screen.getByRole("status")).toHaveTextContent("B");
});
