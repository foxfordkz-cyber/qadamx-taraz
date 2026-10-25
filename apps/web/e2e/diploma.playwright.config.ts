import { defineConfig } from "@playwright/test";
import base from "./research-postgres.playwright.config";

const servers = Array.isArray(base.webServer) ? base.webServer : [];
export default defineConfig({
  ...base,
  testMatch: "diploma.acceptance.ts",
  outputDir: "../test-results/diploma",
  timeout: 180000,
  expect: { timeout: 15000 },
  webServer: [
    {
      ...servers[0],
      command: servers[0].command!.replace(
        "research_browser_server.py",
        "diploma_browser_server.py",
      ),
    },
    {
      ...servers[1],
      env: {
        ...servers[1].env,
        VITE_ASSISTANT_ENABLED: "true",
        VITE_CUSTOMER_IDS_ENABLED: "true",
      },
    },
  ],
});
