import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";
import base from "./qa.playwright.config";

// Named seller regression scope, separate from the real API/PostgreSQL suite.
export default defineConfig({
  ...base,
  testMatch: "seller.spec.ts",
  use: { ...base.use, channel: "chrome", trace: "off" },
  outputDir: fileURLToPath(
    new URL("../../../tmp/stage12/seller/test-results", import.meta.url),
  ),
  reporter: [
    ["list"],
    [
      "junit",
      {
        outputFile: fileURLToPath(
          new URL("../../../tmp/stage12/seller/results.xml", import.meta.url),
        ),
      },
    ],
  ],
});
