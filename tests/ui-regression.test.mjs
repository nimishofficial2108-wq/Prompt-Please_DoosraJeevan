import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = p => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
test('Neuro toolbar uses a multi-row layout with responsive breakpoints', () => {
  const app=read('modules/neuro/src/App.tsx');
  const css=read('modules/neuro/src/workstation-v3.css');
  assert.match(app,/dj-workspace-header/);
  assert.match(app,/dj-global-nav/);
  assert.doesNotMatch(app,/>UI V3</);
  assert.match(css,/dj-workspace-controls/);
  assert.match(css,/@media\(max-width:950px\)/);
});
test('each CT panel has a dedicated non-overlapping header, viewport, and footer', () => {
 const component=read('modules/neuro/src/components/TwoPanelWorkstation.tsx');
 assert.equal((component.match(/dj-neuro-image-stage/g)||[]).length,2);
 assert.equal((component.match(/dj-neuro-panel-toolbar/g)||[]).length,2);
 assert.ok(component.includes('dj-neuro-metrics'));
 assert.ok(component.includes('dj-neuro-bottom'));
});
test('sound starts muted and requires an explicit button interaction', () => {
 const app=read('modules/neuro/src/App.tsx');
 assert.match(app,/useState<boolean>\(true\).*?setIsAudioMuted/s);
 assert.match(app,/hudAudio\.isMuted = false/);
 assert.match(app,/hudAudio\.playActionBeep\('scan'\)/);
});
test('organ blockchain bridge uses correct proxied endpoints', () => {
 const source=read('modules/organ/public/blockchain-bridge.js');
 assert.ok(source.includes('`${BLOCKCHAIN_BRIDGE_URL}/patients/register`'));
 assert.ok(source.includes('`${BLOCKCHAIN_BRIDGE_URL}/ledger/append`'));
 assert.ok(source.includes('`${BLOCKCHAIN_BRIDGE_URL}/ledger`'));
 assert.ok(!source.includes('`${BLOCKCHAIN_BRIDGE_URL}/api/ledger`'));
});

test('V3 compact scan does not start at extreme zoom', () => {
 const file=read('modules/neuro/src/components/TwoPanelWorkstation.tsx');
 assert.match(file,/useState\(1\.35\)/);
 assert.ok(!file.includes('useState(2.5)'));
});
test('V3 CSS is imported from NeuroScan entry stylesheet',()=>{
 assert.match(read('modules/neuro/src/index.css'), /@import "\.\/workstation-v3\.css"/);
});
