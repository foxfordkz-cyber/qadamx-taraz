# Additional setup/tooling failures retained

1. Initial connection attempt to old isolated127.0.0.1:55439: pg_isready reported
   `no response`. No rehearsal output/DB was created. Only the matching Stage11
   rehearsal processes were stopped. A new cluster at55441 was initialized under
   this checkout's ignored tmp; all previous databases/files were preserved.
2. First configuration probe: Node `ERR_MODULE_NOT_FOUND`, attempted
   `qadam-stage11-readiness/web/src/app/auth-callback-config.ts`. The new probe's
   relative import/root were corrected to apps/web. No application change.
   Subsequent9probes passed, including the intentional staging-origin refusal.
3. Initial Ruff reported63new-tool formatting/line-length issues; after automatic
   formatting6long strings remained. Strings wrapped without changing SQL semantics;
   final Ruff and format check passed. No lint suppression was added.
4. One PowerShell combined static-log append encountered a file-sharing lock;
   that command was not counted as a completed format check. The final Python
   subprocess collector ran all3commands and wrote output after handles closed.

These are operator/tool setup failures, not production defects. Original successful
and failed test/migration outputs are in this directory. The final21-check rehearsal
ran again after the tooling commit on three new databases; its source is pinned.
