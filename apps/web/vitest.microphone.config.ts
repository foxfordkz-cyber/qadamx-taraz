import { defineConfig, mergeConfig } from "vitest/config";
import base from "./vite.config";

// An explicit RED acceptance gate until participant #4's implementation arrives.
// No expected-failure inversion in this run; ordinary npm test remains baseline.
export default mergeConfig(
  base,
  defineConfig({
    test: {
      include: [
        "src/test/microphone-*.test.tsx",
        "src/test/microphone-lifecycle.acceptance.tsx",
      ],
      env: { QADAM_MIC_STRICT_KNOWN_GAPS: "1" },
      fileParallelism: false,
    },
  }),
);
