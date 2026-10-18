import { defineConfig } from "@playwright/test";
import base from "./assistant.playwright.config";

export default defineConfig({
  ...base,
  testMatch: "assistant-qa.acceptance.ts",
  outputDir: "../test-results/assistant-qa",
  reporter: [
    ["list"],
    ["json", { outputFile: "test-results/assistant-qa.json" }],
  ],
  use: { ...base.use, screenshot: "only-on-failure" },
});
