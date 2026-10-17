# DoosraJeevan — Layout V3 (fresh extraction)

This revision **changes the actual NeuroScan React header layout and scan canvas sizing**, rather than only appending a few styles.

## Visual verification

Open **NeuroScan** from the DoosraJeevan homepage. In the dark blue toolbar, you **must** see the badge `UI V3` next to "NeuroScan CT Workstation". If not, you are looking at the *old* folder/server/browser tab.

New layout:
- Two stacked toolbar rows, with patient identity and audio at the top and controls beneath.
- CT panels share available width with title + zoom controls in their own toolbar, scans in the center, and telemetry/sliders underneath.
- Right focus starts at **1.35×**, not 2.5×. Zoom using +, −, scroll and reset.
- Desktop: two panels. Phone/tablet: stacked panels.

## Mac: run this exact freshly extracted folder

1. **Stop old terminals first** (Ctrl+C); check ports `5173`, `3002`, `3003`, `4000` with `lsof -nP -iTCP:5173 -sTCP:LISTEN` etc. Close only old processes you recognize. Do not blindly kill every Node process.
2. Extract **this** ZIP into a **new folder**. Avoid mixing old source files with new files.
3. Open terminal inside `DoosraJeevan-Integrated-V3` (the folder containing `package.json`).
4. Run:

```sh
npm run setup:all
npm run dev:all
```

5. Open the **exact URL** displayed by Vite. Click NeuroScan. Verify `UI V3` in the dark-blue top bar. On stale tabs use Cmd+Shift+R.

Do not run `npm run dev` alone; the organ/neuro Express modules must also run.

## Feature checks

- Load a synthetic scan and change Z-axis slice or use the playback controls.
- Zoom/reset both scans and confirm the right panel starts at 1.35×.
- Click **Enable sound** before testing browser audio.
- Click **Load scan** (NIfTI file upload), **Triage queue**, and **Bio-staging**.
- Open Organ Donation: styles should load and local ledger actions can be exercised with synthetic data.
- Report Analysis remains paused.

## Testing boundaries

Code-level tests and a standalone browser CSS layout test were performed. A full React/Vite build was **not** executed in the packaging environment because npm registry DNS resolution was unavailable. External Gemini/Grok, notification services and genuine blockchain transactions are **not** established by this patch. The included local ledger is a simulation.

## Main modified files

- `modules/neuro/src/App.tsx` — actual header markup refactored; `UI V3` badge
- `modules/neuro/src/components/TwoPanelWorkstation.tsx` — default focus/limits and labels
- `modules/neuro/src/index.css` — imports new layout stylesheet
- `modules/neuro/src/workstation-v3.css` — new responsive CSS
- `src/pages/integrated-module.css` — embedded NeuroScan sizing
- `tests/integration.test.mjs` and `tests/ui-regression.test.mjs` — current expectations

Do not use demo patient records or PIN login as real clinical authentication.
