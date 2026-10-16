import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import contract from "../../../../packages/contracts/openapi.json";
import { customerBody, readCustomers } from "../shared/api/bindings";
import {
  defaultFetch,
  deferred,
  ids,
  json,
  renderQa,
  session,
} from "./qa-fixtures";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  window.localStorage.clear();
});
describe("QA regressions — required behaviour", () => {
  it("QA-001: a late 401 from the first A session cannot expire a new A session after A/B/A", async () => {
    const late = deferred<Response>();
    const fetcher = vi.fn<typeof fetch>((input, init) =>
      init?.method === "POST" ? late.promise : defaultFetch(input, init),
    );
    const qa = renderQa({ fetcher });
    await screen.findByRole("heading", { name: "QA Клиент A" });
    const previous = qa.auth();
    await userEvent.click(screen.getByRole("button", { name: /Новый клиент/ }));
    const form = within(screen.getByRole("dialog"));
    await userEvent.type(form.getByLabelText("Имя"), "QA delayed mutation");
    await userEvent.click(
      form.getByRole("button", { name: "Создать клиента" }),
    );
    await waitFor(() =>
      expect(
        fetcher.mock.calls.filter(([, init]) => init?.method === "POST"),
      ).toHaveLength(1),
    );
    act(() => qa.mock.emit(session(ids.b)));
    await screen.findByRole("heading", { name: "QA Клиент B" });
    act(() => qa.mock.emit(session(ids.a, "qa-new-a-session")));
    await screen.findByRole("heading", { name: "QA Клиент A" });
    expect(qa.auth().scope).not.toBe(previous.scope);
    await act(async () => {
      late.resolve(json({}, 401));
    });
    expect(qa.auth().expired).toBe(false);
    expect(
      screen.getByRole("heading", { name: "QA Клиент A" }),
    ).toBeInTheDocument();
  });
  it("QA-002: response next_cursor must declare the same UUID constraint as request cursor", () => {
    const response =
      contract.components.schemas.Page_CustomerResponse_.properties.next_cursor.anyOf.find(
        (s) => s.type === "string",
      );
    const request = contract.paths[
      "/api/v1/businesses/{id}/customers"
    ].get.parameters.find((p) => p.name === "cursor")?.schema;
    expect(request).toMatchObject({
      anyOf: [{ type: "string", format: "uuid" }, { type: "null" }],
    });
    // Currently the response schema permits this string, but its consumer rejects it.
    expect(() =>
      readCustomers({ items: [], next_cursor: "opaque-page-token" }),
    ).toThrow();
    expect(response).toMatchObject({ type: "string", format: "uuid" });
  });
  it("QA-003: CustomerCreate accepts 200 Unicode code points within OpenAPI maxLength", () => {
    const name = "😀".repeat(200);
    expect(Array.from(name)).toHaveLength(
      contract.components.schemas.CustomerCreate.properties.display_name
        .maxLength,
    );
    expect(() =>
      customerBody({ display_name: name, note: "", contact: "" }),
    ).not.toThrow();
  });
});
