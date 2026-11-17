import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";
export default defineConfig({
  testDir: fileURLToPath(new URL(".", import.meta.url)),
  testMatch: "research.acceptance.ts",
  outputDir: "../test-results/research",
  workers: 1,
  retries: 0,
  use: {
    baseURL: "http://127.0.0.1:4296",
    channel: "chrome",
    serviceWorkers: "block",
    trace: "off",
  },
  webServer: {
    command: "npm run dev -- --port 4296 --strictPort",
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    url: "http://127.0.0.1:4296",
    reuseExistingServer: false,
    env: {
      VITE_API_BASE_URL: "http://127.0.0.1:4296/api/v1",
      VITE_SUPABASE_URL: "http://127.0.0.1:4296/__qa_supabase",
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic_qa_only",
      VITE_ASSISTANT_ENABLED: "false",
    },
  },
});
