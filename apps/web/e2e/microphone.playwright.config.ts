import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";

// Desktop Chromium with a generated fake audio device, NOT a physical microphone
// or Android test. No human voice, saved audio, real Supabase or backend is used.
export default defineConfig({
  testDir: fileURLToPath(new URL(".", import.meta.url)),
  // Deliberately not *.spec.ts: default/QA suites must not discover this file
  // without fake audio devices and the isolated synthetic API/Auth server.
  testMatch: "microphone.acceptance.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  outputDir: "../test-results/microphone",
  reporter: [
    ["line"],
    [
      "json",
      {
        outputFile: fileURLToPath(
          new URL("../test-results/microphone/results.json", import.meta.url),
        ),
      },
    ],
  ],
  use: {
    browserName: "chromium",
    baseURL: "http://127.0.0.1:4191",
    viewport: { width: 390, height: 844 },
    permissions: ["microphone"],
    serviceWorkers: "block",
    trace: "off",
    video: "off",
    screenshot: "off",
    launchOptions: {
      args: [
        "--enable-automation",
        "--use-fake-device-for-media-stream",
        "--mute-audio",
      ],
    },
  },
  projects: [
    {
      name: "synthetic-capture",
      grepInvert: /synthetic Chromium microphone denial/,
      use: {
        // Required for native fake-device capture in this Windows Chromium.
        // This flag bypasses permission prompts, so synthetic denial runs in
        // its own project with the explicit native fake-UI "deny" value.
        launchOptions: {
          args: [
            "--enable-automation",
            "--use-fake-device-for-media-stream",
            "--use-fake-ui-for-media-stream",
            "--mute-audio",
          ],
        },
      },
    },
    {
      name: "synthetic-permission-denied",
      grep: /synthetic Chromium microphone denial/,
      use: {
        permissions: [],
        launchOptions: {
          args: [
            "--enable-automation",
            "--use-fake-device-for-media-stream",
            "--use-fake-ui-for-media-stream=deny",
            "--mute-audio",
          ],
        },
      },
    },
  ],
  webServer: {
    command: "npm run dev -- --port 4191 --strictPort",
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    url: "http://127.0.0.1:4191",
    reuseExistingServer: false,
    env: {
      VITE_API_BASE_URL: "http://127.0.0.1:4191/api/v1",
      VITE_SUPABASE_URL: "http://127.0.0.1:4191/__microphone_auth",
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic_microphone_only",
    },
  },
});
