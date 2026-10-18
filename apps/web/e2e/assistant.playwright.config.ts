import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";
import base from "../playwright.config";

export default defineConfig({
  ...base,
  testDir: fileURLToPath(new URL(".", import.meta.url)),
  testMatch: "assistant.spec.ts",
  outputDir: "../test-results/assistant",
  use: {
    ...base.use,
    baseURL: "http://127.0.0.1:4227",
    serviceWorkers: "block",
    trace: "off",
  },
  webServer: {
    command: "npm run dev -- --port 4227 --strictPort",
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    url: "http://127.0.0.1:4227",
    reuseExistingServer: false,
    env: {
      VITE_ASSISTANT_ENABLED: "true",
      VITE_API_BASE_URL: "http://127.0.0.1:4227/api/v1",
      VITE_SUPABASE_URL: "http://127.0.0.1:4227/__qa_supabase",
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic_assistant_only",
    },
  },
});
