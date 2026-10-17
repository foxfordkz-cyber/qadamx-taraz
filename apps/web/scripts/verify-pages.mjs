// Read-only check of the published Pages site. Usage: node scripts/verify-pages.mjs [origin]
// Plain Node, so shell path rewriting (Git Bash/MSYS) cannot alter the routes.
const origin = (process.argv[2] ?? "https://qadamx-taraz.pages.dev").replace(/\/$/, "");
const api = "https://qadamx-taraz.onrender.com/api/v1/health";
const routes = ["/", "/login", "/auth/callback", "/venues/mal-bazar", "/shops/kaikarmet-demo-food", "/seller"];
const mustHave = ["mobile-v0.5.2-review68.1", "Создать аккаунт", "Продавцам — продажи голосом"];
const mustNotHave = ["mobile-v0.3.0"];

let failed = 0;
const report = (ok, label) => {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
};
const get = async (url) => {
  const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(90_000) });
  return { status: res.status, text: await res.text() };
};

for (const route of routes) {
  const { status, text } = await get(origin + route);
  report(status === 200 && text.includes('id="root"'), `${route} -> ${status}`);
}
const html = (await get(origin + "/")).text;
const entry = html.match(/assets\/index-[\w-]+\.js/)?.[0];
report(Boolean(entry), `entry script ${entry ?? "not found"}`);
if (entry) {
  const js = (await get(`${origin}/${entry}`)).text;
  for (const s of mustHave) report(js.includes(s), `bundle contains "${s}"`);
  for (const s of mustNotHave) report(!js.includes(s), `bundle has no "${s}"`);
}
const health = await get(api);
report(health.status === 200, `API health -> ${health.status}`);

console.log(failed ? `RESULT: ${failed} check(s) failed` : "RESULT: all checks passed");
process.exit(failed ? 1 : 0);
