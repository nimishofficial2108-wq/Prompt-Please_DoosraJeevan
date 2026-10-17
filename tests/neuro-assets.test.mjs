import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {join, resolve} from 'node:path';
const root = resolve(import.meta.dirname, '..');
const html = readFileSync(join(root,'modules/neuro/index.html'),'utf8');
const config = readFileSync(join(root,'modules/neuro/vite.config.ts'),'utf8');
test('NeuroScan React entry does not double-apply nested Vite base',()=>{
 assert.match(config,/base:\s*['"]\/modules\/neuro\/['"]/);
 assert.match(html,/src=['"]\/src\/main\.tsx['"]/);
 assert.doesNotMatch(html,/src=['"]\/modules\/neuro\/src\/main\.tsx['"]/);
});
test('NeuroScan owns preloader assets for its Vite base',()=>{
 for (const n of ['doosra-preloader.js','doosra-preloader.css']) {
  assert.ok(existsSync(join(root,'modules/neuro/public',n)),`${n} missing`);
  assert.ok(existsSync(join(root,'public',n)),`root ${n} missing`);
 }
});
test('root proxy and dedicated frontend use the same path',()=>{
 const v = readFileSync(join(root,'vite.config.js'),'utf8');
 const pkg = JSON.parse(readFileSync(join(root,'package.json'),'utf8'));
 assert.match(v,/['"]\/modules\/neuro['"]:\s*\{\s*target:\s*['"]http:\/\/127\.0\.0\.1:5175/);
 assert.match(pkg.scripts['dev:all'],/dev:neuro-ui/);
});
