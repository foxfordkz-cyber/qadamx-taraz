import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";
import base from "./stage9.playwright.config";
process.env.QADAM_QA_API_ORIGIN = "http://127.0.0.1:8322";
process.env.QADAM_QA_EVIDENCE_DIR = fileURLToPath(
  new URL(
    "../../../docs/diploma-evidence/final-integration/screenshots",
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
    "final.acceptance.ts",
  ],
  outputDir: "../test-results/final",
  use: { ...base.use, baseURL: "http://127.0.0.1:4303" },
  webServer: [
    {
      ...servers[0],
      command: servers[0].command!.replace(
        "stage9_browser_server.py",
        "final_browser_server.py",
      ),
      url: "http://127.0.0.1:8322/__qa/info",
    },
    {
      ...servers[1],
      command: "npm run dev -- --port 4303 --strictPort",
      url: "http://127.0.0.1:4303",
      env: {
        ...servers[1].env,
        VITE_API_BASE_URL: "http://127.0.0.1:8322/api/v1",
        VITE_SUPABASE_URL: "http://127.0.0.1:8322",
      },
    },
  ],
});
