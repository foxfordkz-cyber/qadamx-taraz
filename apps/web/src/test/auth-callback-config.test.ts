import { describe, expect, it } from "vitest";
import {
  PRODUCTION_EMAIL_CALLBACK_URL,
  registrationOriginAllowed,
} from "../app/auth-callback-config";

const origin = "https://qadamx-taraz.pages.dev";
describe("exact Cloudflare callback scope", () => {
  it("accepts only the agreed HTTPS origin in a production bundle", () => {
    expect(PRODUCTION_EMAIL_CALLBACK_URL).toBe(`${origin}/auth/callback`);
    expect(
      registrationOriginAllowed(PRODUCTION_EMAIL_CALLBACK_URL, origin, true),
    ).toBe(true);
  });
  it.each([
    "https://qadamx-taraz.vercel.app",
    "https://pr43.qadamx-taraz.pages.dev",
    "https://hash.qadamx-taraz.pages.dev",
    "https://qadamx-taraz.pages.dev.evil.invalid",
    "https://qadamx-taraz.pages.dev:444",
    "http://qadamx-taraz.pages.dev",
    "https://attacker.invalid",
    "https://attacker.invalid@qadamx-taraz.pages.dev",
    "null",
    "not-a-url",
  ])("rejects %s even in development", (unapproved) => {
    for (const production of [true, false]) {
      expect(
        registrationOriginAllowed(
          PRODUCTION_EMAIL_CALLBACK_URL,
          unapproved,
          production,
        ),
      ).toBe(false);
    }
  });
  it.each([
    "http://localhost:5173",
    "http://127.0.0.1:4203",
    "http://[::1]:5173",
  ])("permits loopback %s only for isolated development", (local) => {
    expect(
      registrationOriginAllowed(PRODUCTION_EMAIL_CALLBACK_URL, local),
    ).toBe(true);
    expect(
      registrationOriginAllowed(PRODUCTION_EMAIL_CALLBACK_URL, local, true),
    ).toBe(false);
  });
  it.each([
    "https://unapproved.invalid/auth/callback",
    `${origin}/auth/callback?next=https://unapproved.invalid`,
    `${origin}/auth/callback/`,
    `${origin}/seller`,
    "https://qadamx-taraz.vercel.app/auth/callback",
  ])("rejects substituted callback %s", (callback) => {
    expect(registrationOriginAllowed(callback, origin, true)).toBe(false);
    expect(registrationOriginAllowed(callback, "http://localhost:5173")).toBe(
      false,
    );
  });
});
