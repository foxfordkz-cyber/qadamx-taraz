import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";
import base from "./diploma.playwright.config";

process.env.QADAM_QA_API_ORIGIN = "http://127.0.0.1:8320";
process.env.QADAM_QA_EVIDENCE_DIR = fileURLToPath(
  new URL(
    "../../../docs/diploma-evidence/ai-evaluation-stage8/screenshots",
    import.meta.url,
  ),
);
const servers = Array.isArray(base.webServer) ? base.webServer : [];
export default defineConfig({
  ...base,
  testMatch: ["diploma.acceptance.ts", "extraction.acceptance.ts"],
  outputDir: "../test-results/stage8",
  use: {
    ...base.use,
    baseURL: "http://127.0.0.1:4301",
    extraHTTPHeaders: { Connection: "close" },
  },
  webServer: [
    {
      ...servers[0],
      command: servers[0].command!.replace(
        "diploma_browser_server.py",
        "stage8_browser_server.py",
      ),
      url: "http://127.0.0.1:8320/__qa/info",
    },
    {
      ...servers[1],
      command: "npm run dev -- --port 4301 --strictPort",
      url: "http://127.0.0.1:4301",
      env: {
        ...servers[1].env,
        VITE_API_BASE_URL: "http://127.0.0.1:8320/api/v1",
        VITE_SUPABASE_URL: "http://127.0.0.1:8320",
      },
    },
  ],
});
