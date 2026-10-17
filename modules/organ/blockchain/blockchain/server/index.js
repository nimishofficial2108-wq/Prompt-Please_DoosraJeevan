/**
 * Doosra Jeevan - Blockchain Bridge Server
 * ------------------------------------------
 * Drop-in replacement for the fake "append hash to data.js" logic.
 * This exposes REST endpoints that the existing app.js can call instead
 * of writing to static data.js, so the current UI keeps working while
 * the data underneath becomes real, on-chain, and verifiable.
 */
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { ethers } = require("ethers");

const LEDGER_ABI = require("../artifacts/contracts/DoosraLedger.sol/DoosraLedger.json").abi;
const NFT_ABI = require("../artifacts/contracts/PatientIdentityToken.sol/PatientIdentityToken.json").abi;

const app = express();
app.use(cors());
app.use(express.json());

const provider = new ethers.JsonRpcProvider(process.env.AMOY_RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const ledger = new ethers.Contract(process.env.LEDGER_CONTRACT_ADDRESS, LEDGER_ABI, wallet);
const patientNFT = new ethers.Contract(process.env.PATIENT_NFT_CONTRACT_ADDRESS, NFT_ABI, wallet);

// --- 1. Register a patient -> mints a real NFT, blocks double-listing ---
app.post("/api/patients/register", async (req, res) => {
  try {
    const { uid, walletAddress } = req.body; // uid = Aadhaar/hospital UID (never stored raw on-chain)
    const identityHash = ethers.keccak256(ethers.toUtf8Bytes(uid + process.env.HASH_SALT));

    const alreadyRegistered = await patientNFT.isRegistered(identityHash);
    if (alreadyRegistered) {
      return res.status(409).json({ error: "Patient already registered (double-listing blocked on-chain)" });
    }

    const tx = await patientNFT.mintPatientToken(walletAddress || wallet.address, identityHash);
    const receipt = await tx.wait();

    res.json({
      success: true,
      txHash: receipt.hash,
      identityHash,
      explorerUrl: `https://amoy.polygonscan.com/tx/${receipt.hash}`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- 2. Append a decision/allocation event to the immutable ledger ---
app.post("/api/ledger/append", async (req, res) => {
  try {
    const { recordData, action, clauseRef } = req.body;
    // Real off-chain record gets hashed; only the hash goes on-chain (privacy).
    const dataHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(recordData)));

    const tx = await ledger.appendBlock(dataHash, action, clauseRef);
    const receipt = await tx.wait();

    // Pull the emitted event to get the real block number + hashes for the UI
    const event = receipt.logs
      .map((l) => { try { return ledger.interface.parseLog(l); } catch { return null; } })
      .find((e) => e && e.name === "BlockAppended");

    res.json({
      success: true,
      blockNumber: event.args.blockNumber.toString(),
      prevHash: event.args.prevHash,
      currHash: event.args.currHash,
      txHash: receipt.hash,
      explorerUrl: `https://amoy.polygonscan.com/tx/${receipt.hash}`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- 3. Read the full real ledger (replaces static decision-log array in data.js) ---
app.get("/api/ledger", async (req, res) => {
  try {
    const length = await ledger.chainLength();
    const blocks = [];
    for (let i = 0; i < length; i++) {
      const b = await ledger.getBlock(i);
      blocks.push({
        block_number: b.blockNumber.toString(),
        prev_hash: b.prevHash,
        curr_hash: b.currHash,
        action: b.action,
        clause: b.clauseRef,
        submitted_by: b.submittedBy,
        timestamp: new Date(Number(b.timestamp) * 1000).toISOString(),
      });
    }
    res.json({ blocks, verified: await ledger.verifyIntegrity() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- 4. Flag an anomaly (writes a permanent, tamper-evident flag) ---
app.post("/api/ledger/flag-anomaly", async (req, res) => {
  try {
    const { relatedBlock, reason } = req.body;
    const tx = await ledger.flagAnomaly(relatedBlock, reason);
    const receipt = await tx.wait();
    res.json({ success: true, txHash: receipt.hash });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Blockchain bridge server running on port ${PORT}`));
