import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
const api = fileURLToPath(new URL("../../api", import.meta.url));
const web = fileURLToPath(new URL("..", import.meta.url));
const python = join(
  api,
  ".venv",
  process.platform === "win32" ? "Scripts/python.exe" : "bin/python",
);
if (!process.env.RESEARCH_TEST_DATABASE_URL)
  throw new Error(
    "Set RESEARCH_TEST_DATABASE_URL to a NEW EMPTY qadam_research_browser_*_test DB on loopback",
  );
export default defineConfig({
  testDir: fileURLToPath(new URL(".", import.meta.url)),
  testMatch: "research-postgres.acceptance.ts",
  outputDir: "../test-results/research-postgres",
  workers: 1,
  retries: 0,
  timeout: 60000,
  use: {
    baseURL: "http://127.0.0.1:4297",
    channel: "chrome",
    trace: "off",
    serviceWorkers: "block",
  },
  webServer: [
    {
      command: `"${python}" tests/research_browser_server.py`,
      cwd: api,
      url: "http://127.0.0.1:8316/__qa/info",
      reuseExistingServer: false,
      env: { PYTHONPATH: "." },
      timeout: 60000,
    },
    {
      command: "npm run dev -- --port 4297 --strictPort",
      cwd: web,
      url: "http://127.0.0.1:4297",
      reuseExistingServer: false,
      env: {
        VITE_API_BASE_URL: "http://127.0.0.1:8316/api/v1",
        VITE_SUPABASE_URL: "http://127.0.0.1:8316",
        VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_local_qa_only",
        VITE_ASSISTANT_ENABLED: "false",
      },
    },
  ],
});
