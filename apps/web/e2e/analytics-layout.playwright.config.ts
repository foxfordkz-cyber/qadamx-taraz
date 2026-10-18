import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";
import base from "./assistant.playwright.config";

export default defineConfig({
  ...base,
  testDir: fileURLToPath(new URL(".", import.meta.url)),
  testMatch: "analytics-layout.acceptance.ts",
  outputDir: "../test-results/analytics-layout",
  use: { ...base.use, baseURL: "http://127.0.0.1:4241" },
  webServer: {
    command: "npm run dev -- --port 4241 --strictPort",
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    url: "http://127.0.0.1:4241",
    reuseExistingServer: false,
    env: {
      VITE_ASSISTANT_ENABLED: "true",
      VITE_API_BASE_URL: "http://127.0.0.1:4241/api/v1",
      VITE_SUPABASE_URL: "http://127.0.0.1:4241/__qa_supabase",
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic_redesign_only",
    },
  },
});
