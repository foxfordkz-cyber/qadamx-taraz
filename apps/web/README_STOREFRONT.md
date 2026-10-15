# Public storefront in the unified app

Source: feature/public-storefront a1ba5ae, imported as features/explore and features/inquiry without unrelated Git history, node_modules, dist or a second app shell.

Run from apps/web: npm ci, npm run dev. React 19 uses Fiber 9 / Drei 10, locked in this package. Routes are registered ONLY through src/app/modules.ts in the Seller router. Shared locale context and VITE_API_BASE_URL replace the original standalone settings.

The API uses /api/v1, Page envelopes, venue_id UUID, price_minor integer tiyn and mandatory visitor_name. Inquiries retain the identical request ID AND payload after ambiguous failure. Seller inbox uses shared protected API bindings. Models, bounds, camera and hotspot UUID/slug come from public/venue-assets.json; public API data must match both identifiers. Failed WebGL/GLB leaves preview and ordinary cards.

Current commands, source commits, acceptance and limits: [team integration](../../docs/TEAM_INTEGRATION.md). No deployment is performed by this branch.
