// Deploys the ORIGINAL two contracts from the user-provided blockchain.zip.
const hre = require('hardhat');
const fs = require('node:fs');
const path = require('node:path');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = await hre.ethers.provider.getNetwork();
  const ledger = await (await hre.ethers.getContractFactory('DoosraLedger')).deploy();
  await ledger.waitForDeployment();
  const nft = await (await hre.ethers.getContractFactory('PatientIdentityToken')).deploy();
  await nft.waitForDeployment();
  const deployment = {
    network: hre.network.name,
    chainId: Number(network.chainId),
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    ledger: await ledger.getAddress(),
    patientNFT: await nft.getAddress(),
    ledgerTx: ledger.deploymentTransaction()?.hash || null,
    patientNFTTx: nft.deploymentTransaction()?.hash || null,
  };
  const dir = path.resolve(__dirname,'../deployments');
  fs.mkdirSync(dir,{recursive:true});
  const file=path.join(dir,`${hre.network.name}.json`);
  fs.writeFileSync(file,JSON.stringify(deployment,null,2));
  console.log('[DEPLOY] Real contract deployments confirmed', JSON.stringify(deployment,null,2));
  console.log('[DEPLOY] Manifest:',file);
}
main().catch(e=>{console.error(e);process.exitCode=1});
