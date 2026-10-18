import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";
import base from "../playwright.config";

const port = process.env.QA_ASSISTANT_PORT ?? "4227";
const origin = `http://127.0.0.1:${port}`;

export default defineConfig({
  ...base,
  testIgnore: [],
  testDir: fileURLToPath(new URL(".", import.meta.url)),
  testMatch: "assistant.spec.ts",
  outputDir: "../test-results/assistant",
  use: {
    ...base.use,
    baseURL: origin,
    serviceWorkers: "block",
    trace: "off",
  },
  webServer: {
    command: `npm run dev -- --port ${port} --strictPort`,
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    url: origin,
    reuseExistingServer: false,
    env: {
      VITE_ASSISTANT_ENABLED: "true",
      VITE_API_BASE_URL: `${origin}/api/v1`,
      VITE_SUPABASE_URL: `${origin}/__qa_supabase`,
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic_assistant_only",
    },
  },
});
