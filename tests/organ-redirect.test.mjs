import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const server = readFileSync(path.join(root, 'modules/organ/server.ts'), 'utf8');
const html = readFileSync(path.join(root, 'modules/organ/index.html'), 'utf8');
test('organ homepage serves both slash variants directly without redirect loop', () => {
  assert.match(server, /app\.get\(\['\/modules\/organ', '\/modules\/organ\/'\]/);
  assert.doesNotMatch(server, /res\.redirect\(302, '\/modules\/organ\/'\)/);
  assert.match(server, /express\.static\(publicDir, \{ index: false, redirect: false \}\)/);
});
test('organ CSS, scripts, and logo refer to static assets provided in module', () => {
  for (const file of ['styles.css','unified-theme.css','app.js','data.js','doosra-jeevan-logo.svg']) {
    assert.ok(existsSync(path.join(root, 'modules/organ/public', file)), `${file} missing`);
    assert.ok(html.includes(`/modules/organ/${file}`), `${file} not linked`);
  }
});
