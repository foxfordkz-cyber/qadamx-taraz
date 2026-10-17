import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";

// Desktop engines with mobile viewport, NOT Safari on a physical iPhone.
export default defineConfig({
  testDir: fileURLToPath(new URL(".", import.meta.url)),
  testMatch: "ios-compatibility.acceptance.ts",
  workers: 1,
  retries: 0,
  outputDir: "../test-results/ios-compatibility",
  use: {
    baseURL: "http://127.0.0.1:4212",
    viewport: { width: 390, height: 844 },
    serviceWorkers: "block",
    trace: "off",
    video: "off",
  },
  projects: [
    { name: "desktop-chromium", use: { browserName: "chromium" } },
    { name: "desktop-webkit", use: { browserName: "webkit" } },
  ],
  webServer: {
    command: "npm run dev -- --port 4212 --strictPort",
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    url: "http://127.0.0.1:4212",
    reuseExistingServer: false,
    env: {
      VITE_API_BASE_URL: "http://127.0.0.1:4212/api/v1",
      VITE_SUPABASE_URL: "http://127.0.0.1:4212/__qa_supabase",
      VITE_SUPABASE_PUBLISHABLE_KEY:
        "sb_publishable_synthetic_ios_compatibility_only",
    },
  },
});
