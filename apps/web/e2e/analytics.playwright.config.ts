import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";
import base from "../playwright.config";

// All ordinary regressions plus Analytics, on an isolated synthetic environment.
// Existing QA has its own configuration; never reuse a captain's live server.
export default defineConfig({
  ...base,
  testDir: fileURLToPath(new URL(".", import.meta.url)),
  outputDir: "../test-results/analytics",
  use: {
    ...base.use,
    baseURL: "http://127.0.0.1:4181",
    serviceWorkers: "block",
    trace: "off",
  },
  webServer: {
    command: "npm run dev -- --port 4181 --strictPort",
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    url: "http://127.0.0.1:4181",
    reuseExistingServer: false,
    env: {
      // This aggregate also runs ledger-reading.spec.ts; match its dedicated config.
      VITE_CUSTOMER_IDS_ENABLED: "true",
      VITE_API_BASE_URL: "http://127.0.0.1:4181/api/v1",
      VITE_SUPABASE_URL: "http://127.0.0.1:4181/__qa_supabase",
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic_analytics_only",
    },
  },
});
