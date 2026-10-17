# DoosraJeevan: Report Analysis JSON error fix

This patch addresses `Failed to execute 'json' on 'Response': Unexpected end of JSON input` by safely checking backend and xAI responses before parsing JSON. It surfaces the underlying HTTP/error category; it does **not** guarantee successful Grok analysis without a valid key and a running backend.

## 1. Apply to your existing project

Copy these files to matching paths in your existing homepage folder:

- `src/pages/ReportsPage.jsx` (modified)
- `src/lib/apiResponse.js` (new)
- `server/index.js` (modified)
- `server/providerResponse.js` (new)
- `server/responseHandling.test.js` (new; tests)
- `package.json` (modified; adds script)

Keep the rest of your project unchanged. **Do not replace .env or commit it.**

## 2. Run locally

From the folder containing `package.json`:

```bash
npm install
# create .env if you don't have one: cp .env.example .env
# set XAI_API_KEY to a valid xAI key, XAI_MODEL=grok-4.7
# ALLOW_DEMO_REPORTS=true is ONLY for synthetic, non-personal PDFs
npm run test:responses
npm run test:osm
npm run dev:all
```

Open `http://localhost:3001/api/health` in the browser. It should return:

```json
{"status":"ok","service":"DoosraJeevan reports API"}
```

Try `http://localhost:5173/reports-analysis` with a **synthetic** PDF.

## 3. Understanding the new errors

- **Empty server response / HTTP 502:** Express stopped, the proxy failed, or an upstream request was interrupted. Inspect the Express terminal and run `npm run dev:all`.
- **HTML instead of JSON:** `/api` is being routed to the React app, or a gateway serves an HTML error page. Check `vite.config.js` proxy and backend deployment.
- **Server Grok key not configured / HTTP 503:** `XAI_API_KEY` is missing from backend `.env`, or backend hasn't been restarted.
- **xAI returned HTTP 401/403:** invalid key or permission; check xAI Console.
- **xAI returned HTTP 402:** billing / credits issue.
- **xAI returned HTTP 404:** invalid model or endpoint; confirm `XAI_MODEL`.
- **xAI returned HTTP 429:** rate limit.
- **Grok did not return valid JSON:** model returned text not following the requested structure; retry with a shorter, text-readable synthetic report.

## 4. Important deployment note

`vercel.json` in this starter rewrites all paths to `/index.html` for SPA routing. **That does not deploy the Express backend.** If you opened the site on Vercel, the `/api/analyze` request cannot work until you deploy Node separately or configure serverless functions and route `/api/*` to them.

This prototype includes a hardcoded `User1` / `0000` UI PIN, not secure authentication. Do not use it with real patients or real medical records.

## 5. Git commit

After copying updated files to `homepage/` in your team repo:

```bash
git status
git add homepage/src/pages/ReportsPage.jsx homepage/src/lib/apiResponse.js homepage/server/index.js homepage/server/providerResponse.js homepage/server/responseHandling.test.js homepage/package.json
git commit -m "fix: handle empty API responses in report analysis"
git push
```

Adjust `homepage/` to your actual folder name, and follow your team's branch/PR policy.
