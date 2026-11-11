import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";

if (!process.env.QADAM_QA_SESSION)
  throw new Error("Run via tests/stability_browser_acceptance.py");
export default defineConfig({
  testDir: fileURLToPath(new URL(".", import.meta.url)),
  testMatch: "stability-postgres.acceptance.ts",
  outputDir: "../test-results/stability-postgres",
  workers: 1,
  retries: 0,
  timeout: 150_000,
  use: {
    baseURL: "http://127.0.0.1:4338",
    channel: "chrome",
    headless: false,
    serviceWorkers: "block",
    screenshot: "only-on-failure",
    trace: "off",
  },
  webServer: {
    command: "npm run dev -- --port 4338 --strictPort",
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    url: "http://127.0.0.1:4338",
    reuseExistingServer: false,
    env: {
      VITE_API_BASE_URL: "http://127.0.0.1:8338/api/v1",
      VITE_SUPABASE_URL: "http://127.0.0.1:4338/__qa_supabase",
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic_stability_only",
    },
  },
});
