import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";

// Real Chrome / Supabase SDK; only synthetic HTTP responses, no production login.
export default defineConfig({
  testDir: fileURLToPath(new URL(".", import.meta.url)),
  testMatch: [
    "loading-recovery.acceptance.ts",
    "ai-rate-limit.acceptance.ts",
    "auth-onboarding.acceptance.ts",
    "registration.acceptance.ts",
    "auth-callback.acceptance.ts",
  ],
  outputDir: "../test-results/loading-recovery",
  workers: 1,
  retries: 0,
  timeout: 45_000,
  use: {
    baseURL: "http://127.0.0.1:4328",
    browserName: "chromium",
    channel: "chrome",
    headless: false,
    serviceWorkers: "block",
    trace: "off",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev -- --port 4328 --strictPort",
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    url: "http://127.0.0.1:4328",
    reuseExistingServer: false,
    env: {
      VITE_API_BASE_URL: "http://127.0.0.1:4328/api/v1",
      VITE_SUPABASE_URL: "http://127.0.0.1:4328/__qa_supabase",
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic_loading_only",
    },
  },
});
