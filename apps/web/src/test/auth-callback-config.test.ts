import { describe, expect, it } from "vitest";
import {
  emailCallbackForBuild,
  PR43_BRANCH,
  PR43_EMAIL_CALLBACK_URL,
  PRODUCTION_EMAIL_CALLBACK_URL,
  registrationOriginAllowed,
} from "../app/auth-callback-config";

describe("approved PR43 Preview scope", () => {
  it("fails closed on another deployed origin if Preview build metadata is missing", () => {
    const callback = emailCallbackForBuild(undefined, undefined);
    expect(
      registrationOriginAllowed(
        callback,
        new URL(PR43_EMAIL_CALLBACK_URL).origin,
        true,
      ),
    ).toBe(false);
    expect(
      registrationOriginAllowed(
        callback,
        "https://qadamx-taraz.vercel.app",
        true,
      ),
    ).toBe(true);
    expect(
      registrationOriginAllowed(
        "https://unapproved.invalid/auth/callback",
        "https://unapproved.invalid",
        true,
      ),
    ).toBe(false);
  });
  it("uses the exact approved callback for the PR43 preview build", () => {
    expect(emailCallbackForBuild("preview", PR43_BRANCH)).toBe(
      PR43_EMAIL_CALLBACK_URL,
    );
  });
  it.each([
    ["production", PR43_BRANCH],
    ["production", "main"],
    ["production", "deploy-062"],
    ["preview", "main"],
    ["preview", "another-feature"],
    ["preview", undefined],
    ["development", PR43_BRANCH],
    [undefined, PR43_BRANCH],
    [undefined, undefined],
  ])("preserves the production callback for %s / %s", (env, branch) => {
    expect(emailCallbackForBuild(env, branch)).toBe(
      PRODUCTION_EMAIL_CALLBACK_URL,
    );
  });
  it("allows signup only on the agreed Preview origin when that build is active", () => {
    const origin = new URL(PR43_EMAIL_CALLBACK_URL).origin;
    expect(registrationOriginAllowed(PR43_EMAIL_CALLBACK_URL, origin)).toBe(
      true,
    );
    for (const other of [
      "https://qadamx-taraz.vercel.app",
      "https://unapproved-deployment.vercel.app",
      `${origin}.evil.invalid`,
      `${origin}:444`,
      origin.replace("https:", "http:"),
      "http://localhost:5173",
    ]) {
      expect(registrationOriginAllowed(PR43_EMAIL_CALLBACK_URL, other)).toBe(
        false,
      );
    }
  });
});
