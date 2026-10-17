# DoosraJeevan — integrated hackathon development build

One React/Vite homepage, connected NeuroScan CT workstation, Organ Donation portal, and an optional local blockchain bridge. **Report Analysis is intentionally paused** for this release.

## Run on macOS in VS Code

Prerequisites: Node.js 22+, npm, a free local port 5173, 3002, 3003 and 4000.

```bash
# in this folder (where package.json is)
npm run setup:all
# optional: copy local environment example if you want optional external AI features
cp .env.example .env
npm run dev:all
```

Open **http://localhost:5173/**. Keep the terminal running. Navigate to **NeuroScan** or **Organ Donation** in the same DoosraJeevan header.

The local demo does **not** require Google/Gemini/Mistral/API credentials just to render modules, load synthetic CT scans, play sound after a click, display organ donor information, or use the local simulated ledger. External AI endpoints need actual accounts and credentials.

If 5173 is busy on a Mac, check `lsof -nP -iTCP:5173 -sTCP:LISTEN`, shut down that old dev server, then restart `npm run dev:all`. Do not blindly kill other applications. `--env-file-if-exists` warnings are not fatal; `.env` is optional for the basic demo.

### Connected routes and services

| View | Address | How it works |
|---|---|---|
| Master homepage | `http://localhost:5173/` | React/Vite |
| NeuroScan tab | `http://localhost:5173/neuroscan` | Integrated viewer, proxied at `/modules/neuro/` to 3003 |
| Organ Donation tab | `http://localhost:5173/organ-donation` | Original portal, CSS/JS served at `/modules/organ/` from 3002 |
| Neuro health check | `http://localhost:5173/api/neuro/health` | Proxied to 3003 |
| Organ health check | `http://localhost:5173/api/organ/health` | Proxied to 3002 |
| Ledger status | `http://localhost:5173/api/blockchain/status` | Proxied to 4000, indicates `demo` or `onchain` |

Organ Donation is plain JS/CSS/HTML. Its assets are served **directly by Express at the nested URL**; the previous Vite fallback caused unstyled text. NeuroScan is React/TS with a separate Vite middleware and uses the current supplied stethoscope-enabled code. The parent renders it inside a borderless module area to avoid global CSS collisions and preserve interaction with the original app.

### Quick test path

1. On homepage click **NeuroScan**. The CT viewer starts with a **synthetic normal CT scan** (so it won't open as an empty black screen).
2. Click **Enable Sound** *inside the scanner* (browsers require user action for audio). Click the test button; hear a short beep. With sound enabled, hover/probe the scan to hear the synthesized stethoscope. You may need to unmute your Mac and enable audio in Safari/Chrome permissions. Try Play Slice Animation and the Upload / Demo case selector.
3. Back to homepage, open **Organ Donation**. Text should be styled with navy/coral design, logo and full navigation. Its form, demo matching, information sections and language tools should load.
4. In the Organ portal, ledger actions use `/api/blockchain`. The default bridge is **LOCAL SIMULATION**; it stores an educational hash-chained event record locally. Real Polygon Amoy writes are not enabled without separate credentials, contract deployments and testnet funds. The app must not describe simulated transactions as on-chain.
5. Browser DevTools → Network: `styles.css`, `app.js`, `data.js`, `blockchain-bridge.js` must return 200, not HTML or 404.

### Development verification

```bash
npm run test:integration
npm run test:osm
npm run test:responses
npm run build:all
```

The 6 integration/ledger checks and source syntax validation passed in this packaging environment. **A complete fresh npm dependency installation and browser test could not be completed here because the npm registry timed out**, so please run build/test commands locally and share any terminal errors for further fixes.

## Blockchain modes: important distinction

Default `BLOCKCHAIN_MODE=demo`: backend `modules/blockchain/server/index.js` starts automatically with `npm run dev:all`, saves local synthetic hashed demo identifiers and hash-linked decision events in an ignored `.local-data` folder. **This is NOT a public blockchain, medical consent, organ match certification or official donor registration.** For a real Polygon Amoy *testnet* you must separately deploy the included smart contracts and configure the following environment values in the **root** `.env`:

```env
BLOCKCHAIN_MODE=onchain
AMOY_RPC_URL=https://your-testnet-rpc
PRIVATE_KEY=your_test_wallet_private_key
LEDGER_CONTRACT_ADDRESS=0x...
PATIENT_NFT_CONTRACT_ADDRESS=0x...
HASH_SALT=long-random-demo-secret
```

Then run `npm install --prefix modules/blockchain` to install `ethers`, check the contracts/address deployments and test with **synthetic data only**. The testnet mode must pass successful confirmations for the interface to claim a verified transaction. Never put a private key into the frontend, GitHub, or screenshots. A new testnet-only wallet with faucet tokens is recommended. Original Solidity contracts and ABIs are included at `modules/blockchain/contracts/` and `modules/blockchain/artifacts/`. Deployment requires additional Hardhat dependencies; consult `modules/blockchain/README.md`.

## Medical and privacy notes

All provided synthetic CT examples, bio-staging output, local ledger rows, registry entries and AI interpretations are **educational demonstrations**, NOT diagnoses, risk predictions proven by independent clinical validation, donor suitability certifications, actual organ allocations or an official government service. Use synthetic data only; the PIN demo login `0000` is not secure authentication. Do not upload private patient information into this demo. Actual government donor registration must use authorized channels.

## GitHub

From your team's cloned repo: copy project files (not `node_modules` or `.env`) into your integration branch, verify locally, then:

```bash
git status
git add .
git commit -m "fix: connect organ assets and upgrade NeuroScan stethoscope integration"
git push -u origin YOUR_BRANCH
```

Do not push generated `.local-data`, secret keys, or medical data.
