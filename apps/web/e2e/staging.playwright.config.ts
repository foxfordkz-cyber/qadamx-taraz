import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";
import base from "./final.playwright.config";

const artifact = (path: string) =>
  fileURLToPath(
    new URL(`../../../tmp/stage13/browser/${path}`, import.meta.url),
  );
process.env.QADAM_QA_API_ORIGIN = "http://127.0.0.1:8333";
process.env.QADAM_QA_EVIDENCE_DIR = artifact("screenshots");
const servers = Array.isArray(base.webServer) ? base.webServer : [];

export default defineConfig({
  ...base,
  outputDir: artifact("test-results"),
  reporter: [["list"], ["junit", { outputFile: artifact("results.xml") }]],
  use: {
    ...base.use,
    baseURL: "http://127.0.0.1:4313",
    channel: "chrome",
    trace: "off",
  },
  webServer: [
    {
      ...servers[0],
      command: servers[0].command!.replace(
        "final_browser_server.py",
        "stage13_browser_server.py",
      ),
      url: "http://127.0.0.1:8333/__qa/info",
      reuseExistingServer: false,
      env: {
        ...servers[0].env,
        QA_STAGING_API_PORT: "8333",
        QA_STAGING_WEB_PORT: "4313",
      },
    },
    {
      ...servers[1],
      command: "npm run dev -- --port 4313 --strictPort",
      url: "http://127.0.0.1:4313",
      reuseExistingServer: false,
      env: {
        ...servers[1].env,
        VITE_API_BASE_URL: "http://127.0.0.1:8333/api/v1",
        VITE_SUPABASE_URL: "http://127.0.0.1:8333",
      },
    },
  ],
});
