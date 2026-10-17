# DoosraJeevan — real local blockchain

This version replaces the JSON-backed simulated ledger with **two real Solidity contracts deployed onto a running local Hardhat Ethereum node**. The contracts and deployment logic originate in your uploaded `blockchain.zip`.

## Start everything (Mac / VS Code)

Use the **new extracted project folder**, not an older V3 checkout:

```bash
npm run setup:all
npm run dev:all
```

`dev:all` starts the homepage (5173), Organ Donation (3002), NeuroScan UI (5175), NeuroScan API (3003), plus the **local Hardhat blockchain (8545)** and its REST bridge (4000). The chain launcher waits for RPC readiness, deploys both contracts, writes `modules/blockchain/deployments/localhost.json`, and starts the REST bridge.

**Requirements:** Node.js 22+, npm, ports 5173, 5175, 3002, 3003, 4000, 8545 unused. The installation requires npm access. If the home page has another dev server on 5173, stop it before starting. Never use `npm audit fix --force` merely to resolve the setup.

When it starts, expect logs similar to:

```text
[chain] Starting LOCAL Hardhat blockchain...
[DEPLOY] Real contract deployments confirmed
[CHAIN BRIDGE] Live deployed Hardhat contracts ... chain ID 31337
```

## Verify actual transactions — not simulated data

Keep `npm run dev:all` running. In a second terminal, from the project root:

```bash
npm run chain:smoke
```

This makes a synthetic registration, waits for the **NFT transaction receipt**, appends a **real smart-contract ledger block**, reads it back and verifies the contract's chain-link check. It prints the two genuine local transaction hashes.

Inspect deployed addresses and ledger content:

```bash
curl http://127.0.0.1:4000/api/status
curl http://127.0.0.1:4000/api/ledger
cat modules/blockchain/deployments/localhost.json
```

The manifest includes **contract addresses**, **deployment transaction hashes** and **chain ID 31337**. Addresses change when the local node restarts. They are not publicly discoverable on PolygonScan because this chain is running on your own laptop.

## Architecture

- `modules/blockchain/contracts/DoosraLedger.sol` — genuine Solidity append-only log smart contract
- `modules/blockchain/contracts/PatientIdentityToken.sol` — original ERC-721 synthetic identity token contract
- `modules/blockchain/scripts/deploy.js` — deploy both original contracts and record addresses
- `scripts/run-local-chain.mjs` — start `hardhat node`, deploy, then start REST bridge
- `modules/blockchain/server/index.js` — ethers v6 bridge: actual on-chain `tx.wait()`, reads and verification
- `modules/organ/public/blockchain-bridge.js` — organ registration actions call `/api/blockchain` via same-origin proxy

Do not copy `.env` or `node_modules` from the uploaded ZIP. `.env` and runtime deployments are Git-ignored. This project needs **no personal wallet or private key for local Hardhat**. If you use real data or a real wallet, stop: this is a demonstration, not a patient registry.

## Important limitations

- **Local Hardhat deployment is real blockchain execution**, but is *not* a shared/public network, production hosting, or Polygon Amoy deployment. Restarting the ephemeral Hardhat node **erases chain history** and the launcher redeploys the contracts.
- A successful smart-contract transaction **does not constitute organ-donation registration, clinical brain-death certification, or government verification**.
- The original contracts implement a ledger and a single owner-controlled NFT registry. They **do not** implement actual nine-node multisignature consensus or automated real-world organ matching. `verifyIntegrity()` checks linked previous hashes, not a full external audit.
- No personally identifying or health information should be uploaded or submitted; use synthetic demo cases only.
- The example bridge binds to loopback; it is not authenticated, audited, or suitable for public hosting.
- If you want public explorer history, you'll need a **separate explicit** deployment on Polygon Amoy and genuine deployment receipts; **do not** use example local addresses as Polygon addresses.

## UI cleanup

The Organ Donation “Live AI Pipeline Execution Console” is removed from the page while its hidden log sink and underlying agent controls remain. In NeuroScan, the default “SYNTHETIC DEMO SCAN / Normal sample” header badges are hidden; a small healthcare-use disclaimer elsewhere should still be retained. The two modules still open from the DoosraJeevan navigation.
