# CI/CD gates

GitHub API returns zero Actions workflows; no tracked .github/workflows exists.
PR100–102 checks are Vercel Preview Comments/deployment statuses, not regression
jobs. main protection GET returned404: absent or not readable; protection cannot
be certified. Workflow token permissions/environment approvals cannot be assumed.

Fresh uv sync --locked/npm ci succeeded; npm audit0, dependencies unchanged.
[Focused tests/build/contracts](stage14-test-results.md). render.yaml pins
deploy/permanent-062, autoDeployTrigger off, locked install and validate-only
deploy_start.py, no migration/seed. Dashboard overrides, Vercel env scoping and
production branch unknown. Documented Cloudflare Direct Upload not performed.

Recommended reviewed CI: contents:read only; no cloud/AI/shared DB secrets;
npm ci/audit/typecheck/lint/unit/build/check:api; locked Python/Ruff/pytest on a
NEW disposable PG service. Manual approval and restore evidence before migrations;
never shared migrations in startup/build. No deployment workflow added here.

Stage14 vercel.json at root and apps/web disables only its own new branch using
git.deploymentEnabled; other branches/defaults and cloud protection rules unchanged.
[Preview review](vercel-preview-security-review.md). Verify status after publication;
Ready/skipped is not QA success.
