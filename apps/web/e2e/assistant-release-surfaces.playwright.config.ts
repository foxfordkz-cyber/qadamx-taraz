import { defineConfig } from "@playwright/test";
import base from "./assistant.playwright.config";

export default defineConfig({
  ...base,
  testMatch: "assistant-release-surfaces.acceptance.ts",
  outputDir: "../test-results/assistant-release-surfaces",
  reporter: [
    ["list"],
    ["json", { outputFile: "test-results/assistant-release-surfaces.json" }],
  ],
  use: { ...base.use, screenshot: "only-on-failure" },
});
