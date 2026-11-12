import { defineConfig } from "@playwright/test";
import ledger from "./ledger-reading.playwright.config";
import summary from "./summary-share.playwright.config";
import voice from "./voice-integration.playwright.config";
import auth from "./loading-recovery.playwright.config";

const suites = { ledger, summary, voice, auth };
const name = process.env.QADAM_STAGE3_SUITE ?? "ledger";
if (!(name in suites)) throw new Error("Unknown Stage 3 regression suite");
const base = suites[name as keyof typeof suites];
export default defineConfig({
  ...base,
  use: {
    ...base.use,
    channel: "chrome",
    headless: process.env.QADAM_QA_HEADED !== "1",
    trace: "off",
  },
});
