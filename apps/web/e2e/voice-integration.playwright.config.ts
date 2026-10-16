import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";
import base from "./qa.playwright.config";

// Isolated synthetic Auth/API; never reuse or modify the shared HTTPS preview.
export default defineConfig({
  ...base,
  testMatch: "voice-integration.acceptance.ts",
  outputDir: "../test-results/voice-integration",
  use: {
    ...base.use,
    baseURL: "http://127.0.0.1:4201",
    trace: "off",
    video: "off",
    screenshot: "off",
  },
  webServer: {
    command: "npm run dev -- --port 4201 --strictPort",
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    url: "http://127.0.0.1:4201",
    reuseExistingServer: false,
    env: {
      VITE_API_BASE_URL: "http://127.0.0.1:4201/api/v1",
      VITE_SUPABASE_URL: "http://127.0.0.1:4201/__qa_supabase",
      VITE_SUPABASE_PUBLISHABLE_KEY:
        "sb_publishable_synthetic_voice_review_only",
    },
  },
});
