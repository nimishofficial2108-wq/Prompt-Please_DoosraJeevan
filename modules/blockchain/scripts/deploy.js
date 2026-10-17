const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const Ledger = await hre.ethers.getContractFactory("DoosraLedger");
  const ledger = await Ledger.deploy();
  await ledger.waitForDeployment();
  console.log("DoosraLedger deployed to:", await ledger.getAddress());

  const PatientNFT = await hre.ethers.getContractFactory("PatientIdentityToken");
  const patientNFT = await PatientNFT.deploy();
  await patientNFT.waitForDeployment();
  console.log("PatientIdentityToken deployed to:", await patientNFT.getAddress());

  console.log("\nAdd these to your .env / frontend config:");
  console.log("LEDGER_CONTRACT_ADDRESS=" + (await ledger.getAddress()));
  console.log("PATIENT_NFT_CONTRACT_ADDRESS=" + (await patientNFT.getAddress()));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
