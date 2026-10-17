> **Updated blockchain instructions:** [LOCAL-BLOCKCHAIN-START.md](LOCAL-BLOCKCHAIN-START.md) — real local Hardhat smart contracts, not the earlier simulated ledger.

# DoosraJeevan — Seamless UI integration

## What changed
- Homepage only showcases **NeuroScan** and **Organ Donation**, in two larger cards.
- Both services open as **full browser pages**, without iframe wrapper, reload/new-tab/expand buttons, or blue disclaimer bars.
- A consistent DoosraJeevan nav appears at the top of each page, with Home, NeuroScan and Organ Donation links.
- Poppins is used for all UI copy; Roboto is used for numeric fields/counters.
- Removed visible organ reset buttons, sync/network ticker, block/ledger badges, Hindi feature headings, duplicated infrastructure badges, and most verbose feature descriptions.
- Existing underlying registration, CT, agent and simulated ledger implementations remain included. This work is UI integration, not real-world medical or blockchain verification.

## Run locally (Mac)
```bash
npm run setup:all
npm run dev:all
```
Open http://localhost:5173 and select NeuroScan or Organ Donation.

**Note:** Fonts download from Google Fonts when connected to the internet; system fallback applies offline. The React development server proxy must be running with both module servers for links to work. Report Analysis source is retained but not linked in the UI.

**Medical and registry limitations:** This is a research/hackathon prototype. CT outputs cannot verify brain death or replace medical diagnosis. The default local ledger is a simulation, not a government registry or on-chain audit. Do not upload real patient data to demo systems.
