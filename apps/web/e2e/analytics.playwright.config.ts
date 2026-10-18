import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";
import base from "../playwright.config";

const port = process.env.QA_ANALYTICS_PORT ?? "4181";
const origin = `http://127.0.0.1:${port}`;

// All ordinary regressions plus Analytics, on an isolated synthetic environment.
// Existing QA has its own configuration; never reuse a captain's live server.
export default defineConfig({
  ...base,
  testDir: fileURLToPath(new URL(".", import.meta.url)),
  outputDir: "../test-results/analytics",
  use: {
    ...base.use,
    baseURL: origin,
    serviceWorkers: "block",
    trace: "off",
  },
  webServer: {
    command: `npm run dev -- --port ${port} --strictPort`,
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    url: origin,
    reuseExistingServer: false,
    env: {
      VITE_ASSISTANT_ENABLED: "true",
      // This aggregate also runs ledger-reading.spec.ts; match its dedicated config.
      VITE_CUSTOMER_IDS_ENABLED: "true",
      VITE_API_BASE_URL: `${origin}/api/v1`,
      VITE_SUPABASE_URL: `${origin}/__qa_supabase`,
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic_analytics_only",
    },
  },
});
