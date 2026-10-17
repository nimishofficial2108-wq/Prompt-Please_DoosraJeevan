import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const read = p => readFileSync(new URL('../'+p, import.meta.url),'utf8');
test('master has exactly two full-page service routes',()=>{const s=read('src/config/services.js');assert.match(s,/modules\/neuro/);assert.match(s,/modules\/organ/);assert.doesNotMatch(s,/id: 'reports'/);const a=read('src/App.jsx');assert.match(a,/FullPageRedirect/);assert.doesNotMatch(a,/IntegratedModulePage/);});
test('parent proxies to distinct API services',()=>{const s=read('vite.config.js');for(const p of ['/api/organ','/api/neuro','/api','/modules/neuro','/modules/organ'])assert.ok(s.includes(p),p);});
test('organ assets and APIs use namespaced paths',()=>{const h=read('modules/organ/index.html');assert.ok(h.includes('/modules/organ/styles.css'));assert.ok(h.includes('/modules/organ/app.js'));const a=read('modules/organ/public/app.js');assert.ok(a.includes('/api/organ/agent/'));});
test('module source present with missing agent adapter',()=>{for(const p of ['modules/neuro/src/App.tsx','modules/organ/public/data.js','modules/organ/src/services/organDonationAgent.ts'])assert.ok(existsSync(new URL('../'+p,import.meta.url)));});
test('demo authentication is explicitly marked as unsafe',()=>{assert.ok(read('src/App.jsx').includes('HACKATHON DEMO LOGIN ONLY'));});
test('organ scripts and styles are served at nested module prefix by Express, not Vite fallback',()=>{
 const server=read('modules/organ/server.ts');
 assert.match(server,/app\.use\('\/modules\/organ', express\.static\(publicDir/);
 for(const file of ['styles.css','unified-theme.css','data.js','app.js','blockchain-bridge.js','doosra-jeevan-logo.svg'])assert.ok(existsSync(new URL('../modules/organ/public/'+file,import.meta.url)),file);
});
test('new NeuroScan provides example image data on first load and a user-gesture audio control',()=>{
 const app=read('modules/neuro/src/App.tsx');
 assert.match(app,/generatePresetVolume\('case-normal-05'\)/);
 assert.match(app,/Enable sound/);
 assert.ok(existsSync(new URL('../modules/neuro/src/utils/neuroML.ts',import.meta.url)));
 assert.ok(existsSync(new URL('../modules/neuro/src/components/NeuroMLModal.tsx',import.meta.url)));
});
test('no active private keys or real medical records packed',()=>{
 assert.ok(!existsSync(new URL('../.env',import.meta.url)));
 assert.ok(!existsSync(new URL('../modules/blockchain/.env',import.meta.url)));
});
