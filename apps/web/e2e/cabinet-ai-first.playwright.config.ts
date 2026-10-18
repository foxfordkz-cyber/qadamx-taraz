import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";
import base from "../playwright.config";

const enabled = process.env.CABINET_ASSISTANT_ENABLED !== "false";

export default defineConfig({
  ...base,
  testDir: fileURLToPath(new URL(".", import.meta.url)),
  testMatch: "cabinet-ai-first.spec.ts",
  testIgnore: [],
  grep: enabled ? /enabled:/ : /disabled:/,
  outputDir: "../test-results/cabinet-ai-first",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    ...base.use,
    baseURL: "http://127.0.0.1:4232",
    serviceWorkers: "block",
    trace: "off",
  },
  webServer: {
    command: "npm run dev -- --port 4232 --strictPort",
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    url: "http://127.0.0.1:4232",
    reuseExistingServer: false,
    env: {
      VITE_ASSISTANT_ENABLED: String(enabled),
      VITE_CUSTOMER_IDS_ENABLED: "true",
      VITE_API_BASE_URL: "http://127.0.0.1:4232/api/v1",
      VITE_SUPABASE_URL: "http://127.0.0.1:4232/__qa_supabase",
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic_cabinet_only",
    },
  },
});
