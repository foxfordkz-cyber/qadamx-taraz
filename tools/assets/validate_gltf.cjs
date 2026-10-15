// Independent Khronos glTF Validator pass. The package is a dev tool, not a web dependency.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const args = process.argv.slice(2);
function arg(name, fallback) { const i = args.indexOf(name); return i < 0 ? fallback : args[i + 1]; }
const validator = require(path.resolve(arg('--validator', '../qa-tools/node_modules/gltf-validator')));
const output = path.resolve(arg('--report', path.join(root, 'assets/venues/gltf-validation.json')));
(async () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'apps/web/public/venue-assets.json')));
  const reports = [];
  for (const venue of manifest.venues) {
    const data = fs.readFileSync(path.join(root, 'apps/web/public', venue.model_url));
    const report = await validator.validateBytes(new Uint8Array(data), {
      uri: `${venue.slug}.glb`, maxIssues: 50,
    });
    reports.push({ slug: venue.slug, sha256: crypto.createHash('sha256').update(data).digest('hex'),
      validatorVersion: report.validatorVersion, issues: report.issues, info: report.info });
  }
  const result = { ok: reports.every(r => r.issues.numErrors === 0 && r.issues.numWarnings === 0), reports };
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.ok ? 0 : 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
