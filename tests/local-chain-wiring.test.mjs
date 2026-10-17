import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
test('source Smart Contracts preserved from uploaded Hardhat project',()=>{
 const ledger=read('../modules/blockchain/contracts/DoosraLedger.sol');
 const nft=read('../modules/blockchain/contracts/PatientIdentityToken.sol');
 assert.match(ledger,/function appendBlock\(/);
 assert.match(ledger,/event BlockAppended/);
 assert.match(nft,/function mintPatientToken\(/);
 assert.match(nft,/identityHashUsed/);
});
test('Hardhat network configured as local chain 31337',()=>{
 const cfg=read('../modules/blockchain/hardhat.config.js');
 assert.match(cfg,/localhost:\s*\{/);
 assert.match(cfg,/chainId:\s*31337/);
});
test('single-command dev:all starts local chain orchestration and installs chain deps',()=>{
 const pkg=JSON.parse(read('../package.json'));
 assert.match(pkg.scripts['dev:all'],/dev:chain/);
 assert.match(pkg.scripts['setup:all'],/modules\/blockchain/);
 assert.match(pkg.scripts['dev:chain'],/run-local-chain/);
});
test('bridge only reports deployed Hardhat on-chain after RPC and bytecode checks',()=>{
 const code=read('../modules/blockchain/server/index.js');
 assert.match(code,/provider\.getCode/);
 assert.match(code,/eth|ethers/);
 assert.match(code,/receipt\.hash/);
 assert.match(code,/mode:'onchain'/);
 assert.doesNotMatch(code,/LOCAL SIMULATED/);
});
test('neuroscan synthetic label and organ telemetry console are not visible',()=>{
 const neuro=read('../modules/neuro/src/App.tsx');
 const organ=read('../modules/organ/index.html');
 assert.doesNotMatch(neuro,/\bNormal sample\b/);
 assert.doesNotMatch(neuro,/\$\{activePatient\.primarySubtype\} · demo/);
 assert.doesNotMatch(organ,/Live AI Pipeline Execution Console/);
 assert.match(organ,/<pre id="masterAgentTelemetryLogs" hidden/);
});
test('Organ bridge uses same origin endpoint and does not expose sensitive IDs',()=>{
 const js=read('../modules/organ/public/blockchain-bridge.js');
 assert.match(js,/\/api\/blockchain/);
 assert.match(js,/crypto\.randomUUID\(\)/);
 assert.doesNotMatch(js,/uid: `\$\{fullName\}_/);
});
