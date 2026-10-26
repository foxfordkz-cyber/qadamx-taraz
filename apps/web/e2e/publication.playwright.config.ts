import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";
import base from "./final.playwright.config";

// Reuse the verified suite while preserving frozen Stage 10 screenshots/results.
process.env.QADAM_QA_EVIDENCE_DIR = fileURLToPath(
  new URL("../../../tmp/stage12/browser/screenshots", import.meta.url),
);

export default defineConfig({
  ...base,
  outputDir: fileURLToPath(
    new URL("../../../tmp/stage12/browser/test-results", import.meta.url),
  ),
  reporter: [
    ["list"],
    [
      "junit",
      {
        outputFile: fileURLToPath(
          new URL("../../../tmp/stage12/browser/results.xml", import.meta.url),
        ),
      },
    ],
  ],
});
