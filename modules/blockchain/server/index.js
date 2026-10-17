// DoosraJeevan blockchain bridge: honest local demo by default; optional actual Polygon Amoy transactions.
// Do NOT use this demonstration for patient registration, clinical decisions, or sensitive identities.
const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const PORT=Number(process.env.BLOCKCHAIN_PORT || 4000);
const real=process.env.BLOCKCHAIN_MODE==='onchain';
const repo=path.resolve(__dirname,'..');
const dataDir=process.env.LEDGER_DATA_DIR ? path.resolve(process.env.LEDGER_DATA_DIR) : path.join(repo,'.local-data');
const database=path.join(dataDir,'ledger.json');
const salt=process.env.HASH_SALT || 'local-synthetic-demo-no-real-patients';
const digest=s=>crypto.createHash('sha256').update(s).digest('hex');
const JSONheaders={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Access-Control-Allow-Origin':'http://localhost:5173','Access-Control-Allow-Headers':'Content-Type'};
const reply=(res,status,data)=>{res.writeHead(status,JSONheaders);res.end(JSON.stringify(data));};
function loadDemo(){try{return JSON.parse(fs.readFileSync(database,'utf8'))}catch{return {blocks:[],identities:[]}}}
function saveDemo(data){fs.mkdirSync(dataDir,{recursive:true});fs.writeFileSync(database,JSON.stringify(data,null,2),{mode:0o600})}
async function getBody(req){let b='';for await(const chunk of req){b+=chunk;if(b.length>32_000)throw Error('Body too large')}return b?JSON.parse(b):{}}
let contracts=null;
function useChain(){
 if(contracts)return contracts;
 const required=['AMOY_RPC_URL','PRIVATE_KEY','LEDGER_CONTRACT_ADDRESS','PATIENT_NFT_CONTRACT_ADDRESS','HASH_SALT'];
 const missing=required.filter(k=>!process.env[k]);if(missing.length)throw Error('On-chain mode not configured: '+missing.join(', '));
 const {ethers}=require('ethers');
 const ledgerABI=require('../artifacts/contracts/DoosraLedger.sol/DoosraLedger.json').abi;
 const nftABI=require('../artifacts/contracts/PatientIdentityToken.sol/PatientIdentityToken.json').abi;
 const provider=new ethers.JsonRpcProvider(process.env.AMOY_RPC_URL);
 const wallet=new ethers.Wallet(process.env.PRIVATE_KEY,provider);
 contracts={ethers,provider,wallet,ledger:new ethers.Contract(process.env.LEDGER_CONTRACT_ADDRESS,ledgerABI,wallet),nft:new ethers.Contract(process.env.PATIENT_NFT_CONTRACT_ADDRESS,nftABI,wallet)};
 return contracts;
}
async function handle(req,res){
 if(req.method==='OPTIONS'){res.writeHead(204,JSONheaders);return res.end()}
 const u=new URL(req.url,'http://localhost');
 const p=u.pathname;
 if(p==='/api/health'||p==='/api/status')return reply(res,200,{status:'ok',mode:real?'onchain':'demo',notice:real?'Polygon Amoy configuration selected: network availability must be tested.':'Local simulated ledger — no blockchain transactions or legal registration'});
 if(p==='/api/ledger'&&req.method==='GET'){
  if(!real){const d=loadDemo();return reply(res,200,{blocks:d.blocks,verified:d.blocks.every((b,i)=>b.prev_hash===(i?d.blocks[i-1].curr_hash:'GENESIS')&&b.curr_hash===digest([b.block_number,b.prev_hash,b.action,b.timestamp].join('|'))),mode:'demo'});}
  const {ledger}=useChain();const count=Number(await ledger.chainLength());const blocks=[];
  for(let i=0;i<Math.min(count,500);i++){const b=await ledger.getBlock(i);blocks.push({block_number:b.blockNumber.toString(),prev_hash:b.prevHash,curr_hash:b.currHash,action:b.action,clause:b.clauseRef,submitted_by:b.submittedBy,timestamp:new Date(Number(b.timestamp)*1000).toISOString()})}
  return reply(res,200,{blocks,verified:await ledger.verifyIntegrity(),mode:'onchain'});
 }
 if(p==='/api/patients/register'&&req.method==='POST'){
  const body=await getBody(req);if(typeof body.uid!=='string'||body.uid.length<3||body.uid.length>150)return reply(res,400,{error:'Provide a synthetic demo UID only.'});
  if(!real){const d=loadDemo();const identityHash=digest(salt+'|'+body.uid);if(d.identities.includes(identityHash))return reply(res,409,{error:'Synthetic identity already exists in local demo ledger.'});d.identities.push(identityHash);saveDemo(d);return reply(res,200,{success:true,mode:'demo',identityHash,notice:'Local simulated identity only; not an NFT or legal donor registration.'})}
  const {ethers,nft,wallet}=useChain();const identityHash=ethers.keccak256(ethers.toUtf8Bytes(body.uid+process.env.HASH_SALT));
  if(await nft.isRegistered(identityHash))return reply(res,409,{error:'Identity hash already registered on testnet'});
  const tx=await nft.mintPatientToken(wallet.address,identityHash);const receipt=await tx.wait();return reply(res,200,{success:true,mode:'onchain',identityHash,txHash:receipt.hash,explorerUrl:`https://amoy.polygonscan.com/tx/${receipt.hash}`});
 }
 if(p==='/api/ledger/append'&&req.method==='POST'){
  const body=await getBody(req);const organ=typeof body.recordData?.organ==='string'?body.recordData.organ.slice(0,70):'unspecified';
  // NEVER persist/report a donor's real name, Aadhaar, or medical details in chain events.
  const action=`Synthetic organ donation demo: ${organ}`;
  if(!real){const d=loadDemo();const prev=d.blocks.at(-1)?.curr_hash||'GENESIS';const number=d.blocks.length+1;const timestamp=new Date().toISOString();const curr=digest([number,prev,action,timestamp].join('|'));d.blocks.push({block_number:number,prev_hash:prev,curr_hash:curr,action,timestamp,clause:'Educational demo only'});saveDemo(d);return reply(res,200,{success:true,mode:'demo',blockNumber:number,prevHash:prev,currHash:curr,txHash:null,explorerUrl:null,notice:'Not on-chain'})}
  const {ethers,ledger}=useChain();const recordHash=ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify({organ})));const tx=await ledger.appendBlock(recordHash,action,'Educational demonstration only');const receipt=await tx.wait();const ev=receipt.logs.map(l=>{try{return ledger.interface.parseLog(l)}catch{return null}}).find(x=>x?.name==='BlockAppended');return reply(res,200,{success:true,mode:'onchain',blockNumber:ev?.args?.blockNumber?.toString()||receipt.blockNumber,prevHash:ev?.args?.prevHash||'',currHash:ev?.args?.currHash||'',txHash:receipt.hash,explorerUrl:`https://amoy.polygonscan.com/tx/${receipt.hash}`});
 }
 return reply(res,404,{error:'Unknown ledger endpoint'});
}
http.createServer((req,res)=>{Promise.resolve(handle(req,res)).catch(err=>{console.error('[ledger]',err.message);reply(res,503,{error:err.message,mode:real?'onchain':'demo'})})}).listen(PORT,'127.0.0.1',()=>console.log(`[LEDGER] ${real?'Polygon Amoy':'LOCAL SIMULATED'} ledger on http://127.0.0.1:${PORT}; no real patient information.`));
