import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";
if (!process.env.QADAM_QA_SESSION)
  throw new Error("Run via tests/stage3_browser_acceptance.py");
export default defineConfig({
  testDir: fileURLToPath(new URL(".", import.meta.url)),
  testMatch: "stage3-postgres.acceptance.ts",
  outputDir: "../test-results/stage3-postgres",
  workers: 1,
  retries: 0,
  timeout: 360_000,
  expect: { timeout: 20_000 },
  use: {
    baseURL: "http://127.0.0.1:4348",
    channel: "chrome",
    headless: process.env.QADAM_QA_HEADED !== "1",
    serviceWorkers: "block",
    viewport: { width: 1440, height: 960 },
    screenshot: "only-on-failure",
    trace: "off",
    permissions: ["clipboard-read", "clipboard-write"],
  },
  webServer: {
    command: "npm run dev -- --port 4348 --strictPort",
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    url: "http://127.0.0.1:4348",
    reuseExistingServer: false,
    env: {
      VITE_ASSISTANT_ENABLED: "false",
      VITE_API_BASE_URL: "http://127.0.0.1:8348/api/v1",
      VITE_SUPABASE_URL: "http://127.0.0.1:4348/__qa_supabase",
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic_stage3_only",
    },
  },
});
