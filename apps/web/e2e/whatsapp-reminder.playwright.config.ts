import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";
import base from "./assistant.playwright.config";

export default defineConfig({
  ...base,
  testMatch: "whatsapp-reminder.acceptance.ts",
  outputDir: "../test-results/whatsapp-reminder",
  use: { ...base.use, baseURL: "http://127.0.0.1:4245" },
  webServer: {
    command: "npm run dev -- --port 4245 --strictPort",
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    url: "http://127.0.0.1:4245",
    reuseExistingServer: false,
    env: {
      VITE_ASSISTANT_ENABLED: "true",
      VITE_CUSTOMER_IDS_ENABLED: "true",
      VITE_API_BASE_URL: "http://127.0.0.1:4245/api/v1",
      VITE_SUPABASE_URL: "http://127.0.0.1:4245/__qa_supabase",
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic_whatsapp_only",
    },
  },
});
