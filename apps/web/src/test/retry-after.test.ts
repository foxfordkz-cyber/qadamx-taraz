import { describe, expect, it } from "vitest";
import { createApiClient } from "../shared/api/client";
import { parseApiError, retryDeadline } from "../shared/api/errors";

describe("Retry-After transport metadata", () => {
  const now = Date.parse("2026-11-11T00:00:00Z");
  it("reads seconds and HTTP dates, including past dates", () => {
    expect(retryDeadline("30", now)).toBe(now + 30_000);
    expect(retryDeadline("Wed, 11 Nov 2026 00:01:00 GMT", now)).toBe(
      now + 60_000,
    );
    expect(retryDeadline("Wed, 11 Nov 2026 00:00:00 GMT", now + 5000)).toBe(
      now + 5000,
    );
  });
  it.each([
    null,
    "",
    "-2",
    "NaN",
    "Infinity",
    "1.5",
    "999999999999",
    "private diagnostic",
  ])("ignores invalid header %s", (value) => {
    expect(retryDeadline(value, now)).toBeUndefined();
  });
  it("does not delay credential or validation retries", () => {
    expect(
      parseApiError(401, null, null, "30").metadata.retryAt,
    ).toBeUndefined();
    expect(
      parseApiError(422, null, null, "30").metadata.retryAt,
    ).toBeUndefined();
  });
  it.each([429, 503])(
    "preserves header through API error %s without retaining private server messages",
    async (status) => {
      const api = createApiClient({
        baseUrl: "https://synthetic.example",
        getToken: async () => "synthetic-token",
        fetcher: async () =>
          new Response(
            JSON.stringify({
              error: {
                code: "AI_QUOTA_EXCEEDED",
                message: "private diagnostic",
              },
            }),
            { status, headers: { "Retry-After": "30" } },
          ),
      });
      const before = Date.now();
      const error = await api
        .request("/drafts", { method: "POST" })
        .catch((e: unknown) => e);
      expect(error).toMatchObject({
        status,
        code: "AI_QUOTA_EXCEEDED",
        metadata: { retryAt: expect.any(Number) },
      });
      expect(
        (error as { metadata: { retryAt: number } }).metadata.retryAt,
      ).toBeGreaterThanOrEqual(before + 30_000);
      expect(JSON.stringify(error)).not.toContain("private diagnostic");
    },
  );
});
