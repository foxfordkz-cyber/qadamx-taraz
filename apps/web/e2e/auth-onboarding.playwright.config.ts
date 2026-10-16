import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";
import base from "./qa.playwright.config";

// Real browser and Supabase SDK with synthetic, local HTTP boundaries only.
export default defineConfig({
  ...base,
  testDir: fileURLToPath(new URL(".", import.meta.url)),
  testMatch: ["auth-onboarding.acceptance.ts", "registration.acceptance.ts"],
  outputDir: "../test-results/auth-onboarding",
  use: {
    ...base.use,
    baseURL: "http://127.0.0.1:4203",
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  webServer: {
    command: "npm run dev -- --port 4203 --strictPort",
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    url: "http://127.0.0.1:4203",
    reuseExistingServer: false,
    env: {
      VITE_API_BASE_URL: "http://127.0.0.1:4203/api/v1",
      VITE_SUPABASE_URL: "http://127.0.0.1:4203/__qa_supabase",
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic_onboarding_only",
    },
  },
});
