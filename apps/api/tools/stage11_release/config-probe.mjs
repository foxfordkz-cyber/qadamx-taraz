// Pure local configuration probes. No browser, provider, Auth or HTTP requests.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  registrationOriginAllowed,
  PRODUCTION_EMAIL_CALLBACK_URL as callback,
} from "../../../web/src/app/auth-callback-config.ts";

const root = new URL("../../../../", import.meta.url);
const checks = [];
function check(name, condition) {
  checks.push({ name, pass: Boolean(condition) });
  assert.ok(condition, name);
}
check(
  "exact production origin permits registration",
  registrationOriginAllowed(callback, "https://qadamx-taraz.pages.dev", true),
);
check(
  "arbitrary staging production bundle refuses registration",
  !registrationOriginAllowed(callback, "https://stage11.example.test", true),
);
check(
  "production build refuses loopback registration",
  !registrationOriginAllowed(callback, "http://127.0.0.1:4303", true),
);
check(
  "development permits explicit loopback only",
  registrationOriginAllowed(callback, "http://127.0.0.1:4303", false),
);
check(
  "unapproved callback is refused",
  !registrationOriginAllowed(
    "https://stage11.example.test/auth/callback",
    "https://stage11.example.test",
    false,
  ),
);
const env = Object.fromEntries(
  Object.entries(process.env).filter(([key]) => !key.startsWith("VITE_")),
);
Object.assign(env, {
  VITE_API_BASE_URL: "https://stage11-api.example.test/api/v1",
  VITE_SUPABASE_URL: "https://stage11-auth.example.test",
  VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic_configuration_probe",
});
function guard(changes) {
  return spawnSync(
    process.execPath,
    [fileURLToPath(new URL("apps/web/scripts/check-deploy-env.mjs", root))],
    { env: { ...env, ...changes }, encoding: "utf8" },
  ).status;
}
check("synthetic HTTPS public configuration accepted", guard({}) === 0);
check(
  "plain HTTP API rejected",
  guard({ VITE_API_BASE_URL: "http://stage11-api.example.test/api/v1" }) !== 0,
);
check(
  "wrong API suffix rejected",
  guard({ VITE_API_BASE_URL: "https://stage11-api.example.test/api/v1/" }) !==
    0,
);
check(
  "server secret variable name rejected",
  guard({ VITE_DATABASE_PASSWORD: "SYNTHETIC_NOT_A_SECRET" }) !== 0,
);
writeFileSync(
  process.argv[2],
  JSON.stringify({ node: process.version, live_requests: 0, checks }, null, 2) +
    "\n",
);
console.log(`${checks.length} configuration probes passed; no network used`);
