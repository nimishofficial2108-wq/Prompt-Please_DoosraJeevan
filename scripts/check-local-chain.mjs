// Run while npm run dev:all is active. Actually writes to local chain, then checks read-back.
const base='http://127.0.0.1:4000';
async function request(path,init){const res=await fetch(base+path,init);const body=await res.json();if(!res.ok)throw Error(`${path}: ${body.error||res.status}`);return body}
const status=await request('/api/status');
if(status.mode!=='onchain'||status.chainId!==31337)throw Error('Bridge is not connected to Hardhat smart contracts');
const uid='DEMO_'+crypto.randomUUID();
const headers={'content-type':'application/json'};
const identity=await request('/api/patients/register',{method:'POST',headers,body:JSON.stringify({uid})});
const saved=await request('/api/ledger/append',{method:'POST',headers,body:JSON.stringify({recordData:{organ:'kidney'}})});
const ledger=await request('/api/ledger');
if(!identity.txHash?.startsWith('0x')||!saved.txHash?.startsWith('0x'))throw Error('On-chain transaction hash absent');
if(!ledger.blocks.some(b=>b.curr_hash===saved.currHash))throw Error('Event not found in on-chain ledger read-back');
if(ledger.verified!==true)throw Error('Contract chain linkage verification failed');
console.log('PASS: local hardhat chain ID',status.chainId);
console.log('PASS: deployed contracts',status.contracts);
console.log('PASS: NFT mint tx',identity.txHash);
console.log('PASS: ledger write tx',saved.txHash);
console.log('PASS: on-chain read back',saved.blockNumber,'entries',ledger.blocks.length);
console.log('Note: Hardhat localhost chain is not public Polygon Amoy and resets on restart.');
