# Blockchain backend — current implementation

See **[LOCAL-BLOCKCHAIN-START.md](LOCAL-BLOCKCHAIN-START.md)** for the current, tested implementation.

The prior simulated JSON ledger has been replaced with **deployed Solidity smart contracts on local Hardhat chain ID 31337**.

The exact original Solidity sources are in `modules/blockchain/contracts/`. The auto-deploy script records contract addresses and real transaction hashes in `modules/blockchain/deployments/localhost.json`.

Start with `npm run setup:all` then `npm run dev:all`, and verify with `npm run chain:smoke`.

**Local blockchain is not Polygon Amoy**; no public explorer link or legal donation status can be claimed.
