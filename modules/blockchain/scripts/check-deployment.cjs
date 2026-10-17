// Read-only deployed-contract check for Polygon Amoy.
// Requires AMOY_RPC_URL, LEDGER_CONTRACT_ADDRESS, PATIENT_NFT_CONTRACT_ADDRESS.
// No wallet/private key is required or accessed.
const rpc = process.env.AMOY_RPC_URL;
const checks = [
  ['DoosraLedger', process.env.LEDGER_CONTRACT_ADDRESS],
  ['PatientIdentityToken', process.env.PATIENT_NFT_CONTRACT_ADDRESS],
];
if (!rpc || checks.some(([, address]) => !/^0x[a-fA-F0-9]{40}$/.test(address || ''))) {
  console.error('Configure AMOY_RPC_URL, LEDGER_CONTRACT_ADDRESS and PATIENT_NFT_CONTRACT_ADDRESS in your private .env.');
  process.exit(2);
}
async function call(method, params = []) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(rpc, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      signal: controller.signal,
    });
    if (!response.ok) throw Error(`RPC HTTP ${response.status}`);
    const json = await response.json();
    if (json.error) throw Error(JSON.stringify(json.error));
    return json.result;
  } finally { clearTimeout(timeout); }
}
async function main() {
  const chainId = await call('eth_chainId');
  console.log(`Network chainId: ${parseInt(chainId, 16)}${chainId === '0x13882' ? ' (Polygon Amoy)' : ' (NOT Polygon Amoy!)'}`);
  if (chainId !== '0x13882') { process.exitCode = 2; return; }
  for (const [name, address] of checks) {
    const code = await call('eth_getCode', [address, 'latest']);
    const present = !!code && code !== '0x';
    console.log(`${name}: ${address}`);
    console.log(`Deployed bytecode: ${present ? 'YES' : 'NO'}`);
    console.log(`Explorer: https://amoy.polygonscan.com/address/${address}`);
    console.log(`Transactions: https://amoy.polygonscan.com/txs?a=${address}`);
    console.log();
    if (!present) process.exitCode = 1;
  }
  console.log('Note: bytecode presence confirms a contract is at an address, not that it is YOUR contract. Verify deployment tx and source too.');
}
main().catch(err => { console.error('RPC check failed:', err.message); process.exitCode = 1; });
