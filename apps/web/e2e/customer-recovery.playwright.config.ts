import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";

// Native Chromium Web Locks/storage events; synthetic HTTP only, never a live API.
export default defineConfig({
  testDir: fileURLToPath(new URL(".", import.meta.url)),
  testMatch: "customer-recovery.acceptance.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  outputDir: "../test-results/customer-recovery",
  reporter: "line",
  use: {
    browserName: "chromium",
    baseURL: "http://127.0.0.1:4207",
    serviceWorkers: "block",
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  webServer: {
    command: "npm run dev -- --port 4207 --strictPort",
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    url: "http://127.0.0.1:4207",
    reuseExistingServer: false,
    env: {
      VITE_API_BASE_URL: "http://127.0.0.1:4207/api/v1",
      VITE_SUPABASE_URL: "http://127.0.0.1:4207/__qa_supabase",
      VITE_SUPABASE_PUBLISHABLE_KEY:
        "sb_publishable_synthetic_customer_recovery_only",
    },
  },
});
