import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
test('local blockchain demo: health, registration, duplicate prevention, ledger append and verification',async()=>{
 const d=mkdtempSync(path.join(tmpdir(),'dj-ledger-'));
 const port= 41000+Math.floor(Math.random()*2000);
 const server=spawn(process.execPath,['modules/blockchain/server/index.js'],{cwd:root,env:{...process.env, BLOCKCHAIN_MODE:'demo',BLOCKCHAIN_PORT:String(port),LEDGER_DATA_DIR:d},stdio:'ignore'});
 const endpoint=`http://127.0.0.1:${port}/api`;
 try {
   let active=false;
   for(let i=0;i<35;i++){try{const r=await fetch(endpoint+'/health');if(r.ok){active=true;break}}catch{}await delay(100)}
   assert.equal(active,true,'demo bridge started');
   const status=await(await fetch(endpoint+'/status')).json();assert.equal(status.mode,'demo');
   const reg=await fetch(endpoint+'/patients/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({uid:'synthetic-case-123'})});assert.equal(reg.status,200);
   const duplicate=await fetch(endpoint+'/patients/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({uid:'synthetic-case-123'})});assert.equal(duplicate.status,409);
   const write=await fetch(endpoint+'/ledger/append',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({recordData:{organ:'kidney',fullName:'DO_NOT_STORE_ME'}})});
   const inserted=await write.json();assert.equal(inserted.mode,'demo');assert.equal(inserted.blockNumber,1);assert.equal(inserted.txHash,null);
   const read=await(await fetch(endpoint+'/ledger')).json();assert.equal(read.verified,true);assert.equal(read.blocks.length,1);assert.doesNotMatch(JSON.stringify(read),/DO_NOT_STORE_ME/);
 } finally {server.kill('SIGTERM');rmSync(d,{recursive:true,force:true})}
});
