import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";
import base from "./stage8.playwright.config";
process.env.QADAM_QA_API_ORIGIN = "http://127.0.0.1:8321";
process.env.QADAM_QA_EVIDENCE_DIR = fileURLToPath(
  new URL(
    "../../../docs/diploma-evidence/ai-evaluation-stage9/screenshots",
    import.meta.url,
  ),
);
const servers = Array.isArray(base.webServer) ? base.webServer : [];
export default defineConfig({
  ...base,
  testMatch: [
    "diploma.acceptance.ts",
    "extraction.acceptance.ts",
    "stage9.acceptance.ts",
  ],
  outputDir: "../test-results/stage9",
  use: { ...base.use, baseURL: "http://127.0.0.1:4302" },
  webServer: [
    {
      ...servers[0],
      command: servers[0].command!.replace(
        "stage8_browser_server.py",
        "stage9_browser_server.py",
      ),
      url: "http://127.0.0.1:8321/__qa/info",
    },
    {
      ...servers[1],
      command: "npm run dev -- --port 4302 --strictPort",
      url: "http://127.0.0.1:4302",
      env: {
        ...servers[1].env,
        VITE_API_BASE_URL: "http://127.0.0.1:8321/api/v1",
        VITE_SUPABASE_URL: "http://127.0.0.1:8321",
      },
    },
  ],
});
