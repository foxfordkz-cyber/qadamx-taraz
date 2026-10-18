import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";
import base from "./qa.playwright.config";

// Local synthetic Auth/API only. No microphone, AI service or shared database.
export default defineConfig({
  ...base,
  testMatch: "manual-entry-timing.acceptance.ts",
  retries: 0,
  workers: 1,
  timeout: 120_000,
  outputDir: "../test-results/manual-entry-timing",
  use: {
    ...base.use,
    baseURL: "http://127.0.0.1:4287",
    viewport: { width: 1440, height: 1000 },
    channel: "chrome",
    headless: true,
    trace: "off",
    video: "off",
    screenshot: "off",
  },
  webServer: {
    command: "npm run dev -- --port 4287 --strictPort",
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    url: "http://127.0.0.1:4287",
    reuseExistingServer: false,
    env: {
      VITE_API_BASE_URL: "http://127.0.0.1:4287/api/v1",
      VITE_SUPABASE_URL: "http://127.0.0.1:4287/__qa_supabase",
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic_timing_only",
      VITE_CUSTOMER_IDS_ENABLED: "true",
    },
  },
});
