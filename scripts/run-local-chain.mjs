// One-command orchestration: start a fresh Hardhat RPC, deploy both contracts, start REST bridge.
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
import net from 'node:net';
import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const cwd=resolve(root,'modules/blockchain');
const npm=process.platform==='win32'?'npm.cmd':'npm';
let children=[];
let stopping=false;
function start(script) {
  const p=spawn(npm,['run',script],{cwd,env:process.env,stdio:'inherit'});
  children.push(p);
  p.on('exit',(code,signal)=>{if(!stopping){console.error(`[chain] ${script} terminated unexpectedly: ${code??signal}`);stop(1)}});
  return p;
}
function stop(code=0){
  if(stopping)return;
  stopping=true;
  for(const child of children){try{child.kill('SIGTERM')}catch{}}
  setTimeout(()=>process.exit(code),300).unref();
}
process.on('SIGINT',()=>stop(0));process.on('SIGTERM',()=>stop(0));
async function waitRpc() {
  for(let i=0;i<60;i++) {
    if(stopping)throw Error('Startup interrupted');
    try {
      const response=await fetch('http://127.0.0.1:8545',{
        method:'POST',headers:{'content-type':'application/json'},
        body:JSON.stringify({jsonrpc:'2.0',method:'eth_chainId',params:[],id:1}),
        signal:AbortSignal.timeout(1200)
      });
      if(response.ok && (await response.json()).result==='0x7a69')return;
    }catch{}
    await new Promise(r=>setTimeout(r,500));
  }
  throw Error('Hardhat RPC did not start on port 8545. Check whether another process is using it.');
}
async function deploy() {
  const p=spawn(npm,['run','deploy:local'],{cwd,env:process.env,stdio:'inherit'});
  children.push(p);
  const code=await new Promise(resolve=>p.on('exit',resolve));
  children=children.filter(x=>x!==p);
  if(code!==0)throw Error(`Hardhat deploy failed (exit ${code}).`);
}
async function portOccupied(port) {
  return await new Promise(resolve => {
    const socket = net.connect({host:'127.0.0.1', port});
    socket.once('connect',()=>{socket.destroy();resolve(true)});
    socket.once('error',()=>resolve(false));
    socket.setTimeout(1000,()=>{socket.destroy();resolve(false)});
  });
}
try {
  if (await portOccupied(8545)) throw Error('Port 8545 is already in use. Stop the old Hardhat node before starting dev:all.');
  console.log('[chain] Starting LOCAL Hardhat blockchain on http://127.0.0.1:8545');
  start('node'); await waitRpc();
  await deploy();
  if(stopping)throw Error('Startup interrupted');
  start('server');
  console.log('[chain] Local contracts deployed. Organ Donation now writes real on-chain transactions.');
}catch(e){console.error('[chain]',e.message);stop(1)}
