import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('root proxies NeuroScan UI to isolated Vite port 5175',()=>{
  const config=read('vite.config.js');
  assert.match(config,/['"]\/modules\/neuro['"]:\s*\{\s*target:\s*['"]http:\/\/127\.0\.0\.1:5175/);
  assert.match(config,/['"]\/api\/analyze-ich['"]:\s*\{\s*target:\s*['"]http:\/\/127\.0\.0\.1:3003/);
});
test('one root command starts both NeuroScan UI and API',()=>{
  const p=JSON.parse(read('package.json'));
  assert.match(p.scripts['dev:all'],/dev:neuro-ui/);
  assert.match(p.scripts['dev:all'],/dev:neuro/);
  assert.match(p.scripts['dev:neuro'],/NEURO_API_ONLY=true/);
  const n=JSON.parse(read('modules/neuro/package.json'));
  assert.match(n.scripts['dev:ui'],/vite/);
});
test('NeuroScan API-only server skips embedded Vite',()=>{
  assert.match(read('modules/neuro/server.ts'),/NEURO_API_ONLY === 'true'/);
  assert.match(read('modules/neuro/vite.config.ts'),/base:\s*'\/modules\/neuro\/'/);
});
test('both modules and homepage share one preloader',()=>{
  for(const file of ['index.html','modules/neuro/index.html','modules/organ/index.html']){
    const html=read(file);
    assert.match(html,/\/doosra-preloader\.css/);
    assert.match(html,/\/doosra-preloader\.js/);
  }
  const js=read('public/doosra-preloader.js');
  assert.match(js,/MutationObserver/);
  assert.match(js,/dj-neuro-workstation/);
  assert.match(js,/window\.app/);
  assert.match(js,/dj-error/);
  assert.ok(!js.includes('setTimeout(finish,'));
});
test('blockchain status does not claim unverified addresses',()=>{
  const source=read('modules/organ/server.ts');
  assert.doesNotMatch(source,/0xF4718BfcD0Ccf2ba3888A2a20c8EB6E936Ab3E1a/);
  assert.match(source,/LEDGER_CONTRACT_ADDRESS/);
  assert.match(read('modules/blockchain/scripts/check-deployment.cjs'),/eth_getCode/);
});
