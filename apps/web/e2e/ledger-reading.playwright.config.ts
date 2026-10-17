import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";
import base from "../playwright.config";

export default defineConfig({
  ...base,
  testDir: fileURLToPath(new URL(".", import.meta.url)),
  testMatch: "ledger-reading.spec.ts",
  outputDir: "../test-results/ledger-reading",
  use: {
    ...base.use,
    baseURL: "http://127.0.0.1:4211",
    serviceWorkers: "block",
    trace: "off",
  },
  webServer: {
    command: "npm run dev -- --port 4211 --strictPort",
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    url: "http://127.0.0.1:4211",
    reuseExistingServer: false,
    env: {
      VITE_API_BASE_URL: "http://127.0.0.1:4211/api/v1",
      VITE_SUPABASE_URL: "http://127.0.0.1:4211/__qa_supabase",
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic_ledger_only",
    },
  },
});
