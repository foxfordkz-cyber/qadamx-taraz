import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";

export default defineConfig({
  testDir: fileURLToPath(new URL(".", import.meta.url)),
  testMatch: "inquiry.acceptance.ts",
  outputDir: "../test-results/inquiry",
  workers: 1,
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: "http://127.0.0.1:4189",
    browserName: "chromium",
    serviceWorkers: "block",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- --port 4189 --strictPort",
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    url: "http://127.0.0.1:4189/e2e/inquiry-harness.html",
    reuseExistingServer: false,
    env: {
      VITE_API_BASE_URL: "http://127.0.0.1:4189/api/v1",
      VITE_SUPABASE_URL: "",
      VITE_SUPABASE_PUBLISHABLE_KEY: "",
    },
  },
});
