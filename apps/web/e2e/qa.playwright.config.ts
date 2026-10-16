import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";
import base from "../playwright.config";

// Independent QA server; never reuse a server with unknown/live configuration.
// Exclude the existing screenshot writer to preserve the designer's artifacts.
export default defineConfig({
  ...base,
  testIgnore: [],
  testDir: fileURLToPath(new URL(".", import.meta.url)),
  testMatch: ["seller.spec.ts", "qa-*.spec.ts"],
  outputDir: "../test-results/qa",
  use: {
    ...base.use,
    baseURL: "http://127.0.0.1:4175",
    serviceWorkers: "block",
  },
  webServer: {
    command: "npm run dev -- --port 4175 --strictPort",
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    url: "http://127.0.0.1:4175",
    reuseExistingServer: false,
    env: {
      VITE_API_BASE_URL: "http://127.0.0.1:4175/api/v1",
      VITE_SUPABASE_URL: "http://127.0.0.1:4175/__qa_supabase",
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic_qa_only",
    },
  },
});
