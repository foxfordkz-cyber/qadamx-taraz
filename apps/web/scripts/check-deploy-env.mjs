// Hosting-only guard. Never print public or private configuration values.
const names = [
  "VITE_API_BASE_URL",
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
];
for (const name of names) {
  if (!process.env[name]?.trim()) throw new Error(`Missing ${name}`);
}
for (const name of names.slice(0, 2)) {
  const url = new URL(process.env[name]);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    ["localhost", "127.0.0.1", "0.0.0.0", "[::1]"].includes(url.hostname)
  )
    throw new Error(`Invalid public HTTPS URL: ${name}`);
  if (name === "VITE_API_BASE_URL" && url.pathname !== "/api/v1") {
    throw new Error(
      "VITE_API_BASE_URL must end in /api/v1 (no trailing slash)",
    );
  }
}
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY.trim();
if (!key.startsWith("sb_publishable_")) {
  throw new Error("Use the project publishable key, never a server key");
}
for (const name of Object.keys(process.env)) {
  if (
    name.startsWith("VITE_") &&
    /SECRET|PASSWORD|PRIVATE|SERVICE_ROLE|SERVICE_KEY|DATABASE|OPENAI|GEMINI/i.test(
      name,
    )
  ) {
    throw new Error(
      `Server-only setting is not allowed in browser configuration: ${name}`,
    );
  }
}
console.log("Deployment public configuration: PASS");
