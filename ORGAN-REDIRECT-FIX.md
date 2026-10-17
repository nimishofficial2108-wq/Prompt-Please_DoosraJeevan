# Organ Donation redirect loop fix

**Symptom:** embedded Organ Donation page displays `localhost redirected you too many times.`

**Root cause:** In Express 4, `app.get('/modules/organ')` also matches `/modules/organ/` with default non-strict routing. The old handler redirected to the same path repeatedly.

**Fix:** `modules/organ/server.ts` now serves `index.html` directly for both URL variants. Static assets use `express.static(..., { index:false, redirect:false })`.

## Apply minimal patch to an existing project

Replace `modules/organ/server.ts` with the fixed file, then restart all running servers. You do **not** need to run setup again.

```bash
# From root DoosraJeevan-Integrated folder:
# Ctrl+C in the terminal running dev:all
npm run test:organ-route
npm run dev:all
```

Check the backend directly in a *separate* terminal:

```bash
curl -I http://localhost:3002/modules/organ/
curl -I http://localhost:5173/modules/organ/
curl -I http://localhost:5173/modules/organ/styles.css
```

The first two should return `HTTP/1.1 200 OK` (not repeated `302` redirects); the CSS endpoint should return 200 with CSS content.

If your browser still displays a cached redirect, hard reload (Cmd+Shift+R) or open the app in a private browser tab. Avoid sharing actual patient data in the demo portal.
