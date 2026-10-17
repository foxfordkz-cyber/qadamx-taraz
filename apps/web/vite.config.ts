import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { PRODUCTION_EMAIL_CALLBACK_URL } from "./src/app/auth-callback-config";

export default defineConfig({
  plugins: [react()],
  define: {
    "import.meta.env.VITE_AUTH_EMAIL_CALLBACK_URL": JSON.stringify(
      PRODUCTION_EMAIL_CALLBACK_URL,
    ),
  },
  build: {
    rollupOptions: {
      output: { manualChunks: { auth: ["@supabase/supabase-js"] } },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    exclude: ["e2e/**", "node_modules/**"],
  },
});
