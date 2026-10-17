# Actual local Hardhat blockchain

The included `DoosraLedger.sol` and `PatientIdentityToken.sol` are from the user's uploaded `blockchain.zip`. They run as deployed Solidity contracts on a **local** Hardhat Ethereum JSON-RPC chain (31337). No fake in-memory or JSON-ledger fallback is used for successful writes.

Start from project root: `npm run setup:all && npm run dev:all`.

Then `npm run chain:smoke`, `curl http://127.0.0.1:4000/api/status`, or inspect `deployments/localhost.json`.

This is **not** an official registry or a public blockchain; local state resets on restart. Never submit actual patient information.
