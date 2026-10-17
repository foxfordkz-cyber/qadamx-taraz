import { spawnSync } from "node:child_process";

// PR61 was accepted on Render over HTTPS before this dependent web release.
// Pin the public capability in hosted builds so an absent/old dashboard flag
// cannot silently restore the first-page-only customer lookup.
process.env.VITE_CUSTOMER_IDS_ENABLED = "true";
await import("./check-deploy-env.mjs");

for (const args of [
  ["node_modules/typescript/bin/tsc", "-b"],
  ["node_modules/vite/bin/vite.js", "build"],
]) {
  const result = spawnSync(process.execPath, args, {
    stdio: "inherit",
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
