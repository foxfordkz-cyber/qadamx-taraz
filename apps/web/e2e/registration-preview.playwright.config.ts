import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";
import base from "./qa.playwright.config";
import {
  PR43_BRANCH,
  PR43_EMAIL_CALLBACK_URL,
} from "../src/app/auth-callback-config";

const origin = new URL(PR43_EMAIL_CALLBACK_URL).origin;
export default defineConfig({
  ...base,
  testDir: fileURLToPath(new URL(".", import.meta.url)),
  testMatch: "registration-preview.acceptance.ts",
  outputDir: "../test-results/registration-preview",
  use: {
    ...base.use,
    baseURL: origin,
    serviceWorkers: "block",
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  webServer: {
    // Build the real Preview bundle, serve it only on loopback. The tests fulfill
    // every apparent Preview request locally; no request reaches Vercel/Auth/API.
    command:
      "npm exec -- vite build --outDir test-results/pr43-preview-dist && npm exec -- vite preview --outDir test-results/pr43-preview-dist --host 127.0.0.1 --port 4209 --strictPort",
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    url: "http://127.0.0.1:4209",
    timeout: 180_000,
    reuseExistingServer: false,
    env: {
      VERCEL_ENV: "preview",
      VERCEL_GIT_COMMIT_REF: PR43_BRANCH,
      VITE_API_BASE_URL: `${origin}/api/v1`,
      VITE_SUPABASE_URL: `${origin}/__qa_supabase`,
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic_pr43_only",
    },
  },
});
