# NeuroScan white screen / 404 fix

## Root cause
`modules/neuro/vite.config.ts` uses `base: '/modules/neuro/'`. However the previous HTML entry was already prefixed: `/modules/neuro/src/main.tsx`, so Vite could apply the base again, resulting in a nonexistent entry URL. Preloader JS/CSS also did not exist in NeuroScan's own `public` directory and could be requested from the wrong base.

## Changes
- `modules/neuro/index.html`: changed React entry to `/src/main.tsx` and let Vite apply the configured base once.
- `modules/neuro/public/doosra-preloader.{js,css}`: included the shared DoosraJeevan loader files so `/modules/neuro/...` resolves through the NeuroScan UI server.
- `tests/neuro-assets.test.mjs`: regression checks for incorrect prefixes and missing files.
- `scripts/diagnose-neuro.mjs`: checks the *served HTML asset URLs* on localhost and reports status/MIME.
- `package.json`: commands `npm run test:loader` and `npm run diagnose:neuro`.

## Run
Open the extracted **new** folder in VS Code, stop all old Vite servers, and run:

```bash
npm run setup:all
npm run dev:all
```

Open `http://localhost:5173/modules/neuro/`.

In a separate terminal:

```bash
npm run diagnose:neuro
npm run test:loader
```

If old servers occupy ports 5173 or 5175, locate them with `lsof -nP -iTCP:5173 -sTCP:LISTEN` and `lsof -nP -iTCP:5175 -sTCP:LISTEN` and stop **only the identified old process**. Refresh with Cmd+Shift+R after restart.

## Verification limits
Source-level tests were run. The full React/Vite browser build requires npm dependencies and was not runnable in the artifact environment. Do not use real patient CT scans with this prototype.
