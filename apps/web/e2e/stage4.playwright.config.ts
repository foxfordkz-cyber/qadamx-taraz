import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";
import auth from "./loading-recovery.playwright.config";
import microphone from "./microphone.playwright.config";
import assistant from "./assistant-qa.playwright.config";
import voice from "./voice-integration.playwright.config";
import ledger from "./ledger-reading.playwright.config";
import summary from "./summary-share.playwright.config";
import qa from "./qa.playwright.config";
import publicSuite from "../playwright.config";
import cabinet from "./cabinet-ai-first.playwright.config";
import customer from "./customer-recovery.playwright.config";
import assistantUI from "./assistant.playwright.config";
import assistantSurfaces from "./assistant-release-surfaces.playwright.config";
import analyticsLayout from "./analytics-layout.playwright.config";
import analyticsRedesign from "./analytics-redesign.playwright.config";
import reminders from "./whatsapp-reminder.playwright.config";
import inquiry from "./inquiry-accessibility.playwright.config";
import registrationPreview from "./registration-preview.playwright.config";
import ios from "./ios-compatibility.playwright.config";

const suites = {
  auth,
  microphone,
  assistant,
  voice,
  ledger,
  summary,
  qa,
  public: publicSuite,
  cabinet,
  customer,
  assistantUI,
  assistantSurfaces,
  analyticsLayout,
  analyticsRedesign,
  reminders,
  inquiry,
  registrationPreview,
  ios,
  compatibility: ledger,
};
const name = process.env.QADAM_STAGE4_SUITE ?? "compatibility";
if (!(name in suites)) throw new Error("Unknown offline Stage 4 suite");
const base = suites[name as keyof typeof suites];
export default defineConfig({
  ...base,
  testDir: fileURLToPath(new URL(".", import.meta.url)),
  ...(name === "compatibility"
    ? { testMatch: "stage4-api-compatibility.acceptance.ts" }
    : {}),
  // Screenshot-only writer is not a functional regression suite.
  ...(name === "public"
    ? {
        testIgnore: [
          ...(Array.isArray(base.testIgnore) ? base.testIgnore : []),
          "**/screenshots.spec.ts",
        ],
      }
    : {}),
  outputDir: `../test-results/stage4-${name}`,
  reporter: [
    ["list"],
    ["json", { outputFile: `../test-results/stage4-${name}.json` }],
  ],
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { ...base.expect, timeout: 10_000 },
  use: {
    ...base.use,
    ...(name === "ios" ? {} : { channel: "chrome" }),
    headless: true,
    trace: "off",
  },
  // Preserve WebKit as a distinct desktop engine; Chrome is not iPhone Safari.
  ...(name === "ios"
    ? {
        projects: base.projects?.map((project) => ({
          ...project,
          use: {
            ...project.use,
            channel:
              project.use?.browserName === "webkit" ? undefined : "chrome",
          },
        })),
      }
    : {}),
  webServer: !base.webServer
    ? undefined
    : Array.isArray(base.webServer)
      ? base.webServer
      : {
          ...base.webServer,
          cwd: fileURLToPath(new URL("..", import.meta.url)),
          reuseExistingServer: false,
        },
});
