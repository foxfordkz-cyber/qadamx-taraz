import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";

export default defineConfig({
  testDir: fileURLToPath(new URL(".", import.meta.url)),
  testMatch: "inquiry-accessibility.acceptance.ts",
  workers: 1,
  retries: 0,
  timeout: 60_000,
  outputDir: "../test-results/inquiry-accessibility",
  use: {
    baseURL: "http://127.0.0.1:4192",
    browserName: "chromium",
    launchOptions: { args: ["--enable-unsafe-swiftshader"] },
    serviceWorkers: "block",
    trace: "off",
    video: "off",
  },
  webServer: {
    command: "npm run dev -- --port 4192 --strictPort",
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    url: "http://127.0.0.1:4192",
    reuseExistingServer: false,
    env: {
      VITE_API_BASE_URL: "http://127.0.0.1:4192/api/v1",
      VITE_SUPABASE_URL: "http://127.0.0.1:4192/__synthetic_supabase",
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic_inquiry_only",
    },
  },
});
