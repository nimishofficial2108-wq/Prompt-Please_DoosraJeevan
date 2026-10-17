# DoosraJeevan — NeuroScan Routing + Shared Preloader

## What changed
- **NeuroScan frontend now runs through its own Vite process on port 5175**, proxied transparently through the existing DoosraJeevan homepage at `http://localhost:5173/modules/neuro/`. This avoids sharing NeuroScan's Vite middleware with its Express API server.
- NeuroScan's analysis API remains on port **3003**, Organ Donation remains on **3002**, and the local ledger bridge remains on **4000**.
- **One shared loading screen** appears when opening either NeuroScan or Organ Donation from the homepage and while the destination initializes. The loader uses Poppins, the existing DoosraJeevan heart mark, navy/coral colors, and reduced-motion support.
- Rather than a fake fixed delay, loader hides when NeuroScan's actual React workstation mounts, or Organ Donation's app initializes. A failure after 18 seconds shows Retry / Back to Home.
- Fixed false deployed-contract reporting in the Organ backend: contract addresses are now shown only if configured by the deployer.

## Quick start (Mac / VS Code)
Unzip into a NEW directory. Stop any older Vite/DoosraJeevan sessions first.

```sh
cd DoosraJeevan-Integrated-Neuro-Loader-FIX
npm run setup:all
npm run dev:all
```

Open **http://localhost:5173**.

| Service | Local backend/frontend port |
|---|---|
| Master homepage | 5173 |
| NeuroScan UI (internal) | 5175 |
| NeuroScan Express API | 3003 |
| Organ Donation Express | 3002 |
| Local simulated blockchain API | 4000 |

**Do not browse port 5175 as your main project URL**. The app's integrated public route is `http://localhost:5173/modules/neuro/`.

To validate services:
```sh
npm run check:services
npm run test:integration
npm run test:seamless
npm run test:loader
```

## If NeuroScan is still blank
1. Open `http://localhost:5173/modules/neuro/`. If the app cannot mount within 18 seconds, you should now see a human-readable retry message, not an indefinite white page.
2. Run `curl -I http://localhost:5173/modules/neuro/`. It should return **200** and an HTML document.
3. Run `curl -I http://localhost:5173/modules/neuro/src/main.tsx`. It should return **200** and JavaScript/TSX transformed by Vite.
4. Open Chrome DevTools > Console and Network; share the **first red error** and any red network requests. The error could be a runtime exception inside the uploaded NeuroScan source, which cannot be confirmed without a full Mac browser test.
5. Check `lsof -nP -iTCP:5173 -iTCP:5175 -iTCP:3002 -iTCP:3003 -iTCP:4000 -sTCP:LISTEN` for collisions.

The code was examined and static tests added. **End-to-end CT audio, real AI inference and full Mac browser render are not claimed to be verified**. Do not use real patient scans for demo testing.

## Blockchain
Read [`BLOCKCHAIN-BACKEND.md`](./BLOCKCHAIN-BACKEND.md) for the honest distinction between the local simulated ledger and any independently deployed Polygon Amoy contracts.

## Medical-use limitation
This is a research/hackathon prototype. CT visualizations or generated predictions are not medical diagnoses; brain death requires clinical evaluation and legally designated medical boards. Never use synthetic demo matching or a local ledger as an official organ donation registration.
