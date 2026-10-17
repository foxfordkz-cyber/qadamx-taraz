# Cloudflare routing gate — 2026-10-17

The supplied ff89693 artifact passed checksum and source comparison, but its actual
Cloudflare deployment 00e8cf17-ef4b-443e-b880-5f339ea394db returned HTTP 308
Location: / for /auth/callback. Following redirects hid this failure behind the
homepage's HTTP 200. Production was rolled back to
1cd035e1-b6db-43d4-8d0e-45914ecb777d (8fa0029) before any live email acceptance.

Remove the explicit /index.html rewrites. This project has no root 404.html, so
Cloudflare Pages supplies its documented SPA fallback while retaining the requested
route and query. Keep the callback no-store/no-referrer headers.
Reference: https://developers.cloudflare.com/pages/configuration/serving-pages/

Deployment acceptance must request /register, /auth/callback, /seller and /seller/sale
with redirect following DISABLED and require HTTP 200 and no Location header.
Also check /auth/callback?code=qadam-routing-probe (synthetic non-secret value),
no-store/no-referrer and exact uploaded asset hashes. A Vite preview is not evidence
for Cloudflare routing behavior. Real email acceptance remains separate and NOT RUN.

Only hosting routing changes. Existing runtime JS/CSS/models and API are unchanged.
Repacked artifact must identify this new source commit and retain ff89693 as the
original bundle source, rather than claim byte identity to the supplied ZIP.
