import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = p => fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('homepage has exactly two linked services and no report analysis nav',()=>{
  const s=read('src/config/services.js');
  assert.equal((s.match(/id:\s*'/g)||[]).length,2);
  assert.match(s,/\/modules\/neuro\//);
  assert.match(s,/\/modules\/organ\//);
  assert.doesNotMatch(s,/id:\s*'reports'/);
});
test('React uses full-page route navigation without module iframe',()=>{
  const s=read('src/App.jsx');
  assert.match(s,/window\.location\.replace\(to\)/);
  assert.doesNotMatch(s,/<iframe/);
  assert.doesNotMatch(s,/IntegratedModulePage/);
});
test('both modules include same DoosraJeevan top navigation',()=>{
  for(const s of [read('modules/organ/index.html'),read('modules/neuro/src/App.tsx')]){
    assert.match(s,/dj-global-nav/);
    assert.match(s,/\/modules\/neuro\//);
    assert.match(s,/\/modules\/organ\//);
  }
});
test('organ app suppressed technical status bars and dangerous reset buttons',()=>{
  const s=read('modules/organ/public/doosra-shell.css');
  for(const cls of ['.gov-header','.ticker-bar','.network-sync-pill','#btnRefreshSync','#btnSidebarResetDb','.btn-clean-reset','.integration-disclaimer']) assert.ok(s.includes(cls),cls);
});
test('Poppins and Roboto configured for each app',()=>{
  for(const p of ['src/styles.css','modules/neuro/src/index.css','modules/organ/public/doosra-shell.css']){
    const s=read(p); assert.match(s,/Poppins/); assert.match(s,/Roboto/);
  }
});
test('neuro dev HTML entry is base-relative so Vite applies prefix once',()=>{
  assert.match(read('modules/neuro/index.html'),/src="\/src\/main.tsx"/);
  assert.doesNotMatch(read('modules/neuro/index.html'),/src="\/modules\/neuro\/src\/main.tsx"/);
});
