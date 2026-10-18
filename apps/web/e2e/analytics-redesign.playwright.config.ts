import { defineConfig } from "@playwright/test";
import base from "./assistant.playwright.config";

export default defineConfig({
  ...base,
  testMatch: "analytics-redesign.acceptance.ts",
});
