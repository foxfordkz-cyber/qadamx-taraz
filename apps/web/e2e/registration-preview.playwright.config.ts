import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";
import base from "./qa.playwright.config";
import { PRODUCTION_EMAIL_CALLBACK_URL } from "../src/app/auth-callback-config";

const origin = new URL(PRODUCTION_EMAIL_CALLBACK_URL).origin;
export default defineConfig({
  ...base,
  testDir: fileURLToPath(new URL(".", import.meta.url)),
  testMatch: "registration-preview.acceptance.ts",
  outputDir: "../test-results/registration-preview",
  use: {
    ...base.use,
    baseURL: origin,
    // No unhandled browser request may resolve a public host. The static-file
    // proxy uses a separate Node APIRequestContext and loopback only.
    launchOptions: {
      args: [
        "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE localhost",
      ],
    },
    serviceWorkers: "block",
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  webServer: {
    // Build the real Cloudflare bundle, serve it only on loopback. The tests fulfill
    // every apparent Cloudflare request locally; no request reaches Cloudflare/Auth/API.
    command:
      "npm exec -- vite build --outDir test-results/pr43-preview-dist && npm exec -- vite preview --outDir test-results/pr43-preview-dist --host 127.0.0.1 --port 4209 --strictPort",
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    url: "http://127.0.0.1:4209",
    timeout: 180_000,
    reuseExistingServer: false,
    env: {
      VERCEL_ENV: "preview",
      VERCEL_GIT_COMMIT_REF: "integration/seller-registration-deploy-review",
      CF_PAGES: "1",
      CF_PAGES_BRANCH: "main",
      CF_PAGES_URL: "https://unapproved.pages.dev",
      VITE_AUTH_EMAIL_CALLBACK_URL: "https://unapproved.invalid/auth/callback",
      VITE_API_BASE_URL: `${origin}/api/v1`,
      VITE_SUPABASE_URL: `${origin}/__qa_supabase`,
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic_pr43_only",
    },
  },
});
