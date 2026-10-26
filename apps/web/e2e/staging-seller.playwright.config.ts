import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";
import base from "./publication-seller.playwright.config";

const artifact = (path: string) =>
  fileURLToPath(
    new URL(`../../../tmp/stage13/seller/${path}`, import.meta.url),
  );
export default defineConfig({
  ...base,
  outputDir: artifact("test-results"),
  reporter: [["list"], ["junit", { outputFile: artifact("results.xml") }]],
});
