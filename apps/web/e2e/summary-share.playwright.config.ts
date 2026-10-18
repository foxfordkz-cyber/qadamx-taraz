import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";
import base from "./qa.playwright.config";
export default defineConfig({
  ...base,
  testMatch: "summary-share.acceptance.ts",
  outputDir: "../test-results/summary-share",
  retries: 0,
  workers: 1,
  use: {
    ...base.use,
    baseURL: "http://127.0.0.1:4288",
    channel: "chrome",
    permissions: ["clipboard-read", "clipboard-write"],
    trace: "off",
  },
  webServer: {
    command: "npm run dev -- --port 4288 --strictPort",
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    url: "http://127.0.0.1:4288",
    reuseExistingServer: false,
    env: {
      VITE_API_BASE_URL: "http://127.0.0.1:4288/api/v1",
      VITE_SUPABASE_URL: "http://127.0.0.1:4288/__qa_supabase",
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic_qa_only",
      VITE_ASSISTANT_ENABLED: "false",
    },
  },
});
