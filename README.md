# DoosraJeevan — Integrated Homepage, NeuroScan and Organ Donation

**Start here: [START-HERE.md](START-HERE.md).**

**Local smart contracts and verified transactions: [LOCAL-BLOCKCHAIN-START.md](LOCAL-BLOCKCHAIN-START.md).**

# DoosraJeevan — Unified NeuroScan + Organ Donation

## Quick start on Mac

Requirements: Node.js 22+ and npm.

```bash
npm run setup:all
npm run dev:all
```
Open the URL printed by `[HOME]` (normally `http://localhost:5173`).

Click **NeuroScan** or **Organ Donation** on the homepage or top navigation. The experience navigates to **full pages**, not embedded frames. The same DoosraJeevan navigation is present inside each module.

### Services
- `HOME`: Vite frontend, usually port 5173
- `ORGAN`: organ portal server, port 3002
- `NEURO_UI`: dedicated Vite CT viewer, port 5175 (proxied at `/modules/neuro/`)
- `NEURO_API`: CT workstation API, port 3003
- `CHAIN`: local Hardhat Ethereum chain, port 8545, deployed Solidity contracts, and REST bridge on port 4000

### Local tests
```bash
npm run test:seamless
npm run test:integration
npm run test:ledger
npm run chain:smoke    # while dev:all is running, proves real transaction receipts
npm run test:ui
npm run test:organ-route
npm run check:services  # while servers are running
```

### What's different
- Only **NeuroScan** and **Organ Donation** are shown in the homepage and navigation. Report Analysis is not enabled.
- A consistent full-width navbar, Poppins text and Roboto numeric styles appear across the three screens.
- Organ Donation hides lengthy descriptions, duplicated Hindi headings, demo network/consensus badges, block-height metrics, sync and reset buttons.
- Module navigation uses native routes `/modules/neuro/` and `/modules/organ/`, not iframe panels.
- The modules' core workflow files remain present; no real hospital-grade verification is claimed.

### If the port is in use
```bash
lsof -nP -iTCP:5173 -sTCP:LISTEN
# Stop the old process after identifying its PID:
kill <PID>
npm run dev:all
```
Only kill processes you recognize as your old dev server. If the module pages don't load, verify that ORGAN and NEURO both printed their listening messages.

### API credentials
You don't need a key to load the module interfaces or synthetic CT case. Advanced AI features need their configured providers. Only `.env.example` is included; never commit `.env` or secrets.

### Prototype limitations
This is not a medical device or official registration portal. **NeuroScan cannot diagnose or certify brain death.** Official donation registration and clinical decisions must go through authorized processes. The bundled ledger executes **real local Hardhat contract transactions**, but is not a verified Polygon transaction, persists only while its local chain runs, and is not an official registry. Use synthetic data only.

Fonts load from Google Fonts when internet access is available; a system sans-serif fallback is used offline.
