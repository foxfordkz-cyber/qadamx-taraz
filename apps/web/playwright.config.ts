import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: {
    baseURL: "http://127.0.0.1:4173",
    browserName: "chromium",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- --port 4173 --strictPort",
    url: "http://127.0.0.1:4173",
    // Public browser fixtures intercept this address; no credentials are used.
    env: { VITE_API_BASE_URL: "http://127.0.0.1:8000/api/v1" },
    reuseExistingServer: !process.env.CI,
  },
});
