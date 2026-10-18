// Read-only deployment smoke. No authentication, assistant calls or writes.
// Usage: node scripts/verify-pages.mjs [https://qadamx-taraz.pages.dev]
const origin = new URL(process.argv[2] ?? "https://qadamx-taraz.pages.dev");
if (
  origin.protocol !== "https:" ||
  origin.username ||
  origin.password ||
  origin.pathname !== "/"
) {
  throw new Error("Use an HTTPS origin without credentials or a path.");
}
const results = [];
const assets = new Set();
for (const route of [
  "/",
  "/login",
  "/register",
  "/auth/callback",
  "/seller",
  "/seller/analytics",
]) {
  try {
    const response = await fetch(new URL(route, origin), {
      redirect: "error",
      signal: AbortSignal.timeout(30_000),
    });
    const html = await response.text();
    const ok =
      response.ok &&
      response.headers.get("content-type")?.includes("text/html") &&
      /id=["']root["']/.test(html);
    const modules = [
      ...html.matchAll(
        /(?:src|href)=["']([^"']*\/assets\/[^"']+\.(?:js|css))["']/g,
      ),
    ];
    if (!modules.length) throw new Error("No bundled JS/CSS assets found");
    for (const [, asset] of modules) {
      const url = new URL(asset, origin);
      if (url.origin !== origin.origin)
        throw new Error("Unexpected cross-origin bundle");
      assets.add(url.href);
    }
    results.push({ route, status: response.status, ok: Boolean(ok) });
  } catch (error) {
    results.push({ route, ok: false, error: error.message });
  }
}
for (const asset of assets) {
  try {
    const response = await fetch(asset, {
      redirect: "error",
      signal: AbortSignal.timeout(30_000),
    });
    const contentType = response.headers.get("content-type") ?? "";
    const ok =
      response.ok &&
      (asset.endsWith(".css")
        ? contentType.includes("text/css")
        : /javascript/.test(contentType));
    results.push({ asset, status: response.status, ok });
    await response.body?.cancel();
  } catch (error) {
    results.push({ asset, ok: false, error: error.message });
  }
}
console.log(
  JSON.stringify(
    {
      origin: origin.origin,
      checked_at: new Date().toISOString(),
      scope:
        "SPA routes and static bundles only; not an AI, Auth or physical-device acceptance",
      results,
    },
    null,
    2,
  ),
);
if (results.some((result) => !result.ok)) process.exitCode = 1;
