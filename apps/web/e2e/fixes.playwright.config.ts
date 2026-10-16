import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";
import base from "../playwright.config";

// Run all existing specs plus the fixes on an isolated synthetic environment.
export default defineConfig({
  ...base,
  testDir: fileURLToPath(new URL(".", import.meta.url)),
  outputDir: "../test-results/fixes",
  use: {
    ...base.use,
    baseURL: "http://127.0.0.1:4177",
    serviceWorkers: "block",
  },
  webServer: {
    command: "npm run dev -- --port 4177 --strictPort",
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    url: "http://127.0.0.1:4177",
    reuseExistingServer: false,
    env: {
      VITE_API_BASE_URL: "http://127.0.0.1:4177/api/v1",
      VITE_SUPABASE_URL: "http://127.0.0.1:4177/__fixes_auth",
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic_fixes_only",
    },
  },
});
