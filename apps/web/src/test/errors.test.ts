import { describe, expect, it } from "vitest";
import examples from "../../../../packages/contracts/examples.json";
import { parseApiError } from "../shared/api/errors";
import { createApiClient } from "../shared/api/client";
import { errorKey } from "../shared/ui";

const id = "70000000-0000-4000-8000-000000000001";
describe("published error envelope (bootstrap contract, not a live response)", () => {
  it("propagates validated metadata through the shared HTTP transport", async () => {
    const api = createApiClient({
      baseUrl: "https://api.example.test/api/v1",
      getToken: async () => "test-token",
      fetcher: async () =>
        new Response(JSON.stringify(examples.ErrorResponse), {
          status: 422,
          headers: { "Content-Type": "application/json" },
        }),
    });
    await expect(api.request("/test-only")).rejects.toMatchObject({
      status: 422,
      code: "CUSTOMER_REQUIRED",
      metadata: { requestId: id },
    });
  });
  it("reads the captain's checked-in example and keeps no raw server message", () => {
    const error = parseApiError(422, examples.ErrorResponse, null);
    expect(error.code).toBe("CUSTOMER_REQUIRED");
    expect(error.metadata.requestId).toBe(id);
    expect(error.metadata.fields?.customer_id).toEqual(["CUSTOMER_REQUIRED"]);
    expect(error.message).not.toContain(examples.ErrorResponse.error.message);
  });
  it("uses a valid request header if the JSON response is absent", () => {
    const error = parseApiError(500, "private traceback", id);
    expect(error.metadata.requestId).toBe(id);
    expect(error.message).toBe("HTTP_500");
  });
  it("does not expose arbitrary request IDs, fields or malformed codes", () => {
    const error = parseApiError(
      403,
      {
        request_id: "private payload",
        error: {
          code: "private server text",
          message: "secret",
          fields: { display_name: "private name", note: [123] },
        },
      },
      "private header",
    );
    expect(error.code).toBe("HTTP_403");
    expect(error.metadata.requestId).toBeUndefined();
    expect(Object.keys(error.metadata.fields ?? {})).toEqual([]);
  });
  it.each([
    [409, "dataChanged"],
    [422, "validationError"],
    [429, "rateLimited"],
  ])("localizes HTTP %s", (status, key) => {
    expect(errorKey(parseApiError(status as number, null, null))).toBe(key);
  });
});
