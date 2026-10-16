import { describe, expect, it, vi } from "vitest";
import contract from "../../../../packages/contracts/openapi.json";
import {
  backendBindings,
  customerBody,
  readCustomer,
  readCustomers,
  readMe,
} from "../shared/api/bindings";
import { createLiveGateway } from "../shared/api/gateway";
import { createApiClient } from "../shared/api/client";
import { customer, ids, json, meA } from "./qa-fixtures";

describe("QA accepted OpenAPI snapshot — static contract, not live backend", () => {
  it("requires Bearer for every published private operation", () => {
    expect(contract.components.securitySchemes.HTTPBearer).toMatchObject({
      type: "http",
      scheme: "bearer",
    });
    // Explicit public surface of API 0.5.0; every other method must require JWT.
    const publicRoutes = new Set([
      "get /health",
      "get /api/v1/health",
      "get /api/v1/venues",
      "get /api/v1/businesses",
      "get /api/v1/businesses/{slug}",
      "post /api/v1/businesses/{id}/inquiries",
      "get /api/v1/livestock/listings",
      "get /api/v1/livestock/listings/{id}",
      "get /api/v1/livestock/prices",
      "get /api/v1/livestock/listings/{id}/photos/{photo_id}",
    ]);
    for (const [path, operations] of Object.entries(contract.paths)) {
      for (const [method, operation] of Object.entries(operations)) {
        const security = (operation as { security?: unknown }).security;
        if (publicRoutes.has(`${method} ${path}`))
          expect(security).toBeUndefined();
        else
          expect(security, `${method} ${path}`).toEqual([{ HTTPBearer: [] }]);
      }
    }
  });
  it("resolves every local reference and rejects external schema dependencies", () => {
    function walk(value: unknown) {
      if (!value || typeof value !== "object") return;
      for (const [key, item] of Object.entries(value)) {
        if (key === "$ref") {
          expect(item).toMatch(/^#\//);
          let resolved: unknown = contract;
          for (const segment of String(item).slice(2).split("/"))
            resolved = (resolved as Record<string, unknown>)[
              segment.replace(/~1/g, "/").replace(/~0/g, "~")
            ];
          expect(resolved, String(item)).toBeDefined();
        } else walk(item);
      }
    }
    walk(contract);
  });
  it("pins UUID path parameters and customer pagination limits to the accepted schema", () => {
    const route = contract.paths["/api/v1/businesses/{id}/customers"];
    expect(route.get.parameters.find((p) => p.name === "id")).toMatchObject({
      in: "path",
      required: true,
      schema: { type: "string", format: "uuid" },
    });
    expect(
      route.get.parameters.find((p) => p.name === "limit")?.schema,
    ).toMatchObject({ type: "integer", minimum: 1, maximum: 100, default: 50 });
    expect(
      route.get.parameters.find((p) => p.name === "q")?.schema,
    ).toMatchObject({ type: "string", maxLength: 200 });
    expect(
      route.get.parameters.find((p) => p.name === "cursor")?.schema,
    ).toMatchObject({
      anyOf: [{ type: "string", format: "uuid" }, { type: "null" }],
    });
    expect(
      route.post.responses[201].content["application/json"].schema.$ref,
    ).toBe("#/components/schemas/CustomerResponse");
  });
  it("preserves nullable contact, optional note and server integer balance", () => {
    const schemas = contract.components.schemas;
    expect(schemas.CustomerCreate.required).toEqual(["display_name"]);
    expect(schemas.CustomerCreate.additionalProperties).toBe(false);
    expect(schemas.CustomerCreate.properties.contact.anyOf).toEqual([
      { type: "string", maxLength: 200 },
      { type: "null" },
    ]);
    expect(schemas.CustomerResponse.properties.balance_minor).toMatchObject({
      type: "integer",
      minimum: 0,
    });
    expect(
      customerBody({ display_name: " QA ", note: " ", contact: " " }),
    ).toEqual({ display_name: "QA", note: "", contact: null });
    expect(readCustomer(customer())).toMatchObject({
      contact: null,
      balance_minor: 12345,
    });
  });
  it("money fields stay integer minor units, including nullable and signed deltas", () => {
    let count = 0;
    for (const schema of Object.values(contract.components.schemas)) {
      for (const [name, raw] of Object.entries(schema.properties)) {
        if (!name.endsWith("_minor")) continue;
        count++;
        const field = raw as { type?: string; anyOf?: { type: string }[] };
        expect(
          field.anyOf
            ? field.anyOf.filter((s) => s.type !== "null").map((s) => s.type)
            : [field.type],
          name,
        ).toEqual(["integer"]);
      }
    }
    expect(count).toBeGreaterThan(10);
    expect(
      contract.components.schemas.SaleCreate.properties.total_minor,
    ).toMatchObject({ exclusiveMinimum: 0, maximum: 10_000_000_000 });
    expect(
      contract.components.schemas.SummaryResponse.properties.currency.const,
    ).toBe("KZT");
    expect(
      contract.components.schemas.SummaryResponse.properties.timezone.const,
    ).toBe("Asia/Almaty");
  });
  it("documented errors reference ErrorResponse; robustness-only statuses are not invented contract responses", () => {
    const responses =
      contract.paths["/api/v1/businesses/{id}/customers"].post.responses;
    for (const [status, response] of Object.entries(responses)) {
      if (Number(status) < 400) continue;
      expect(response.content["application/json"].schema.$ref).toBe(
        "#/components/schemas/ErrorResponse",
      );
    }
    expect(contract.components.schemas.ErrorResponse.required).toEqual([
      "error",
      "request_id",
    ]);
    expect(
      contract.components.schemas.ErrorResponse.properties.request_id.format,
    ).toBe("uuid");
    expect(Object.keys(responses)).not.toEqual(
      expect.arrayContaining(["403", "429", "500"]),
    );
  });
  it("every enabled gateway request maps to an actual accepted path and method", async () => {
    const fetcher = vi.fn<typeof fetch>(async (input, init) => {
      const path = new URL(String(input)).pathname;
      if (path.endsWith("/me")) return json(meA);
      if (path.endsWith("/inquiries"))
        return json({ items: [], next_cursor: null });
      if (path.endsWith("/" + meA.businesses[0].slug))
        return json({
          ...meA.businesses[0],
          venue_id: ids.shopA,
          category: "clothes",
          description: "QA catalog fixture",
          is_demo: true,
          catalog: [],
        });
      return init?.method === "POST"
        ? json(customer(), 201)
        : json({ items: [customer()], next_cursor: null });
    });
    const gateway = createLiveGateway(
      createApiClient({
        baseUrl: "https://qa.invalid/api/v1",
        getToken: async () => "qa-only",
        fetcher,
      }),
      backendBindings,
      ids.a,
    );
    await gateway.me();
    await gateway.customers(meA.businesses[0], "Әсел", ids.customer);
    await gateway.createCustomer(meA.businesses[0], {
      display_name: "QA",
      note: "",
      contact: "",
    });
    await expect(gateway.catalog(meA.businesses[0])).resolves.toEqual({
      items: [],
      next_cursor: null,
    });
    await expect(gateway.inquiries(meA.businesses[0], null)).resolves.toEqual({
      items: [],
      next_cursor: null,
    });
    const paths: Record<string, unknown> = contract.paths;
    for (const [input, init] of fetcher.mock.calls) {
      const path = new URL(String(input)).pathname
        .replace(meA.businesses[0].slug, "{slug}")
        .replace(ids.shopA, "{id}");
      expect(paths).toHaveProperty(path);
      expect(paths[path]).toHaveProperty((init?.method ?? "GET").toLowerCase());
    }
    expect(fetcher).toHaveBeenCalledTimes(5);
  });
  it("keeps ambiguous multipart text/audio XOR in OpenAPI for future runtime validation", () => {
    const schema =
      contract.paths["/api/v1/businesses/{id}/drafts"].post.requestBody.content[
        "multipart/form-data"
      ].schema;
    expect(schema.oneOf).toEqual([
      { required: ["text"], not: { required: ["audio"] } },
      { required: ["audio"], not: { required: ["text"] } },
    ]);
    expect(schema.additionalProperties).toBe(false);
  });
  it("rejects duplicate customer IDs and duplicate memberships instead of silently merging", () => {
    expect(() =>
      readCustomers({ items: [customer(), customer()], next_cursor: null }),
    ).toThrow();
    expect(() =>
      readMe({ ...meA, businesses: [meA.businesses[0], meA.businesses[0]] }),
    ).toThrow();
  });
});
