# Blockchain bridge (two explicit modes)

Default: `npm run dev:all` from project root launches a **LOCAL EDUCATIONAL SIMULATION** at `127.0.0.1:4000`. It exposes `/api/status`, `/api/ledger`, `/api/patients/register`, and `/api/ledger/append`. The homepage proxies these at `/api/blockchain/...`. No wallet, billing, testnet network or external service is needed to test the local *demo*. Data is persisted as hash-linked synthetic records in `.local-data/` and is not on-chain.

## Optional real Polygon Amoy testnet

The original smart contracts `DoosraLedger.sol` and `PatientIdentityToken.sol` and their ABI JSON files are bundled. To enable real writes, these contracts must be deployed on Polygon Amoy **by you**, using a dedicated testnet wallet, faucet gas tokens, and appropriate RPC URL. Real transactions require a signing private key **server-side only**. The backend refuses to silently substitute demo writes if on-chain mode is configured but unavailable.

For deployments from this folder (optional): `npm install` then copy `.env.example` to `.env`, configure **testnet-only** wallet, RPC and hash salt; run `npx hardhat compile` then `npx hardhat run scripts/deploy.js --network amoy`. Check hardhat version/plugin compatibility and contract deploy results. Set addresses in project-root `.env` and `BLOCKCHAIN_MODE=onchain`, then `npm run dev:all` at project root.

Network endpoints and testnet availability can vary. No actual network transaction was verified by the code packaging step. Never send patient names or personal health information to blockchain events. This scaffold hashes synthetic identifiers and sends only generic descriptions; it's not appropriate for real healthcare without rigorous security, audit and compliance review.
