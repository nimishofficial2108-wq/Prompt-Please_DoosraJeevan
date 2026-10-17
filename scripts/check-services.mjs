/** Diagnostics for a running local DoosraJeevan instance. Run after npm run dev:all. */
const base = process.env.APP_URL || 'http://localhost:5173';
const checks = [
  ['Homepage', '/', 'text/html'],
  ['NeuroScan', '/modules/neuro/', 'text/html'],
  ['NeuroScan React entry', '/modules/neuro/src/main.tsx', 'javascript'],
  ['Organ Donation', '/modules/organ/', 'text/html'],
  ['Organ stylesheet', '/modules/organ/styles.css', 'text/css'],
  ['Organ JavaScript', '/modules/organ/app.js', 'javascript'],
  ['Shared module loader', '/doosra-preloader.js', 'javascript'],
  ['NeuroScan health', '/api/neuro/health', 'application/json'],
  ['Organ health', '/api/organ/health', 'application/json'],
  ['Ledger status', '/api/blockchain/status', 'application/json'],
];
let fail = 0;
for (const [name,path,type] of checks) {
  try {
    const res = await fetch(new URL(path,base), {signal: AbortSignal.timeout(6000),redirect:'follow'});
    const contentType = res.headers.get('content-type')||'';
    if (!res.ok || !contentType.includes(type)) {
      fail++;
      console.log(`✗ ${name}: HTTP ${res.status}, type=${contentType} (expected ${type})`);
    } else {
      console.log(`✓ ${name}: ${res.status}`);
    }
  } catch (error) {
    fail++;
    console.log(`✗ ${name}: ${error.message}`);
  }
}
console.log(fail ? `\n${fail} checks failed: inspect terminal logs / running ports.` : `\nAll ${checks.length} local service checks passed.`);
process.exitCode = fail ? 1 : 0;
