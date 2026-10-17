// Live, locally deployed Ethereum smart contracts via Hardhat RPC.
// Adapted from the uploaded blockchain.zip server, with safe local-only defaults.
// IMPORTANT: Only synthetic demo identities; not a clinical registry or medical authorization.
const express = require('express');
const { ethers } = require('ethers');
const fs = require('node:fs');
const path = require('node:path');

const app = express();
app.use(express.json({limit:'24kb'}));
const port = Number(process.env.BLOCKCHAIN_PORT || 4000);
const rpc = process.env.LOCAL_RPC_URL || 'http://127.0.0.1:8545';
const deploymentPath = path.resolve(__dirname, '../deployments/localhost.json');
const ledgerArtifact = require('../artifacts/contracts/DoosraLedger.sol/DoosraLedger.json');
const nftArtifact = require('../artifacts/contracts/PatientIdentityToken.sol/PatientIdentityToken.json');
const salt = process.env.HASH_SALT || 'LOCAL_ONLY_SYNTHETIC_TEST_2026';
const crypto = require('node:crypto');

function getDeployment() {
  if (!fs.existsSync(deploymentPath)) throw new Error('No local deployment. Start with npm run dev:all or npm run dev:chain.');
  const d = JSON.parse(fs.readFileSync(deploymentPath,'utf8'));
  if (d.chainId !== 31337 || !ethers.isAddress(d.ledger) || !ethers.isAddress(d.patientNFT)) throw new Error('Invalid local Hardhat contract deployment manifest');
  return d;
}
async function getChain() {
  const d = getDeployment();
  const provider = new ethers.JsonRpcProvider(rpc, 31337);
  const net = await provider.getNetwork();
  if (Number(net.chainId) !== 31337) throw new Error(`Wrong blockchain chain ID (${net.chainId}), expected 31337`);
  const [ledgerCode, nftCode] = await Promise.all([provider.getCode(d.ledger),provider.getCode(d.patientNFT)]);
  if (ledgerCode === '0x' || nftCode === '0x') throw new Error('Smart contracts not deployed at manifest addresses. Restart npm run dev:chain.');
  // Hardhat unlocked local development account; never request real private keys from the browser.
  const signer = await provider.getSigner(0);
  const ledger = new ethers.Contract(d.ledger,ledgerArtifact.abi,signer);
  const nft = new ethers.Contract(d.patientNFT,nftArtifact.abi,signer);
  return {d,provider,signer,ledger,nft};
}
function refuseSensitive(v) {
  if (!v || typeof v !== 'string' || !/^DEMO_[a-f0-9-]{20,64}$/i.test(v)) {
    const error=new Error('Synthetic DEMO_ UUID required; do not enter Aadhaar, names or real patient identifiers.');
    error.status=400; throw error;
  }
}
const asyncRoute = f => (req,res,next)=>Promise.resolve(f(req,res)).catch(next);
const safeMeta = d => ({mode:'onchain', network:'hardhat-local',chainId:31337, contracts:{ledger:d.ledger,patientNFT:d.patientNFT},explorerUrl:null, notice:'Real local Hardhat transactions. Not Polygon Amoy; local state resets if the Hardhat node restarts.'});

app.get('/api/health', asyncRoute(async(_req,res)=>{
  const {d,provider} = await getChain();res.json({status:'ok',...safeMeta(d),blockHeight:await provider.getBlockNumber()});
}));
app.get('/api/status', asyncRoute(async(_req,res)=>{
  const {d,provider,ledger} = await getChain();
  res.json({status:'ok',...safeMeta(d),blockHeight:await provider.getBlockNumber(),ledgerEntries:Number(await ledger.chainLength())});
}));
app.get('/api/ledger', asyncRoute(async(_req,res)=>{
  const {d,ledger} = await getChain(); const count=Number(await ledger.chainLength());
  const blocks=[];
  // Local-only demo: keep reads bounded, preserve real block numbers and on-chain hashes.
  for(let i=0;i<Math.min(count,500);i++) {
    const b=await ledger.getBlock(i);
    blocks.push({block_number:b.blockNumber.toString(),prev_hash:b.prevHash,curr_hash:b.currHash,
      action:b.action,clause:b.clauseRef,submitted_by:b.submittedBy,
      timestamp:new Date(Number(b.timestamp)*1000).toISOString()});
  }
  res.json({blocks,verified:await ledger.verifyIntegrity(),...safeMeta(d)});
}));
app.post('/api/patients/register', asyncRoute(async(req,res)=>{
  const uid=req.body?.uid; refuseSensitive(uid);
  const {d,nft,signer}=await getChain();
  const identityHash=ethers.keccak256(ethers.toUtf8Bytes(salt+'|'+uid));
  if(await nft.isRegistered(identityHash)) return res.status(409).json({error:'Synthetic ID already registered on local chain'});
  const tx=await nft.mintPatientToken(await signer.getAddress(),identityHash);
  const receipt=await tx.wait();
  res.json({success:true,identityHash,txHash:receipt.hash,blockNumber:receipt.blockNumber,...safeMeta(d)});
}));
app.post('/api/ledger/append', asyncRoute(async(req,res)=>{
  const organ = String(req.body?.recordData?.organ || '').trim().toLowerCase();
  const allow=new Set(['eyes','heart','liver','kidney','kidneys','blood','lungs','lung','pancreas','skin','bone marrow','cornea','corneas']);
  if (!allow.has(organ)) return res.status(400).json({error:'Select a supported synthetic demo organ'});
  const {d,ledger}=await getChain();
  const action=`Demo organ record: ${organ}`;
  // Do not put patient identifiers, medical reports or direct sensitive information on chain.
  const dataHash=ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify({organ,nonce:crypto.randomUUID()})));
  const tx=await ledger.appendBlock(dataHash,action,'Educational demo only');
  const receipt=await tx.wait();
  const event=receipt.logs.map(l=>{try{return ledger.interface.parseLog(l)}catch{return null}}).find(e=>e?.name==='BlockAppended');
  if(!event) throw new Error('On-chain receipt does not include BlockAppended event');
  res.json({success:true,blockNumber:event.args.blockNumber.toString(),prevHash:event.args.prevHash,
    currHash:event.args.currHash,txHash:receipt.hash,blockHeight:receipt.blockNumber,...safeMeta(d)});
}));
app.post('/api/ledger/flag-anomaly', asyncRoute(async(req,res)=>{
  const {d,ledger}=await getChain();
  const relatedBlock=Number(req.body?.relatedBlock);
  const reason=String(req.body?.reason || '').slice(0,100);
  if(!Number.isInteger(relatedBlock)||relatedBlock<0||!reason) return res.status(400).json({error:'relatedBlock and a short reason required'});
  const tx=await ledger.flagAnomaly(relatedBlock,reason);
  const receipt=await tx.wait(); res.json({success:true,txHash:receipt.hash,...safeMeta(d)});
}));
app.use((err,_req,res,_next)=>{
  console.error('[local blockchain]',err.message);
  res.status(err.status||503).json({error:err.message,mode:'unavailable'});
});
app.listen(port,'127.0.0.1',()=>console.log(`[CHAIN BRIDGE] Live deployed Hardhat contracts via http://127.0.0.1:${port}; chain ID 31337`));
