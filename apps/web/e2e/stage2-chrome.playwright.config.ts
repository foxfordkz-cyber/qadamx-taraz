import { defineConfig } from "@playwright/test";
import microphone from "./microphone.playwright.config";
import assistant from "./assistant-qa.playwright.config";
import voice from "./voice-integration.playwright.config";
import auth from "./loading-recovery.playwright.config";

// Reuse the actual suites and their isolated origins; installed Chrome on Windows.
// microphone uses a generated test device and MUST NOT be reported as physical QA.
const suites = { microphone, assistant, voice, auth };
const name = process.env.QADAM_STAGE2_SUITE ?? "microphone";
if (!(name in suites)) throw new Error("Unknown offline Stage 2 suite");
const base = suites[name as keyof typeof suites];
export default defineConfig({
  ...base,
  use: { ...base.use, channel: "chrome", headless: false, trace: "off" },
});
