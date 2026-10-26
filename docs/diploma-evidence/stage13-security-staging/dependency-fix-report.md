# Targeted dependency fix

Changed only direct dev dependency `vitest`: range ^3.2.0 (locked 3.2.7) to exact
4.1.12. No `npm audit fix --force`, no overrides and no application dependencies
were upgraded. Lock diff records 25 changed/added/removed dev package nodes plus
root manifest metadata: runs/dependency-changes.json. @vitest/* now 4.1.12;
tinypool and vite-node are absent. Vite stays 7.3.7; React/Supabase/application
versions are unchanged.

The registry recommended Vitest5, but the advisory fixes are backported to 4.1.12.
Vitest3 ends at 3.2.7 in the inspected registry and has no patched line for these
advisories. One reviewed major dev dependency update is therefore required; no
unrelated major migration was attempted. [Vitest4 migration guidance](https://v4.vitest.dev/guide/migration)
confirms the pool rewrite removes tinypool. Config uses jsdom, maxWorkers and
standard reporters, with no removed poolOptions/browser-provider/coverage APIs.
Risks include changed mocks/assertions/reporting and worker isolation; full tests,
TypeScript and the normal build are the compatibility gates. No assertions or
production code were weakened to obtain a pass.

Commands (apps/web):
```powershell
npm audit --json
npm audit --omit=dev --json
npm view vitest@4.1.12 version engines dependencies peerDependencies --json
npm view vitest@3 version --json
npm install --save-dev --save-exact vitest@4.1.12 --ignore-scripts --no-audit
npm ci
npm audit --json
npm audit --omit=dev --json
npm ls vitest @vitest/mocker tinypool vite --depth=2
```

The first targeted lock update disables install scripts; subsequent required
`npm ci` verifies the full lock installation under this runtime's script policy.
The esbuild allowScripts notice and ESLint9/whatwg-encoding deprecation warnings
are retained in logs. Build success is recorded separately; a deprecation notice
is not equated with a new CVE. Full fresh results: full-test-results.md.
