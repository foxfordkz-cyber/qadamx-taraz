import { defineConfig } from "@playwright/test";
import base from "./research-postgres.playwright.config";

const servers = Array.isArray(base.webServer) ? base.webServer : [];
export default defineConfig({
  ...base,
  testMatch: "extraction.acceptance.ts",
  outputDir: "../test-results/extraction",
  timeout: 90000,
  expect: { timeout: 15000 },
  use: { ...base.use, baseURL: "http://127.0.0.1:4299" },
  webServer: [
    {
      ...servers[0],
      command: servers[0].command!.replace(
        "research_browser_server.py",
        "extraction_browser_server.py",
      ),
      url: "http://127.0.0.1:8317/__qa/info",
    },
    {
      ...servers[1],
      command: "npm run dev -- --port 4299 --strictPort",
      url: "http://127.0.0.1:4299",
      env: {
        ...servers[1].env,
        VITE_API_BASE_URL: "http://127.0.0.1:8317/api/v1",
        VITE_SUPABASE_URL: "http://127.0.0.1:8317",
        VITE_CUSTOMER_IDS_ENABLED: "true",
      },
    },
  ],
});
