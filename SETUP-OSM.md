# Replace Google Places with OpenStreetMap + Overpass (DoosraJeevan)

## What changed

**Doctor finder only.** Report upload, Grok PDF analysis, User1 demo PIN login, homepage and routes remain unchanged.

| Previous implementation | Updated implementation |
| --- | --- |
| Google Places API key + billing required | Public Overpass API; **no key or Google billing** |
| Google doctor/clinic listings | OpenStreetMap doctors' practices, clinics and hospitals |
| Google Maps links and rating fields | OpenStreetMap links, approximate distances and mapped specialty flags |
| Google Places Text Search | A scoped, server-side Overpass query for healthcare objects |

You will get **up to five mapped care options**, not a medically verified “top 5 doctors” ranking. Actual doctors and specialist availability must be independently confirmed.

## Exact files to add/replace in your existing project

Copy the following paths from the `Changed-Files` ZIP into your existing React/Vite project, preserving their relative paths:

```text
homepage/
├── server/
│   ├── index.js                 REPLACE — /api/doctors now calls OpenStreetMap
│   ├── osmDoctors.js            NEW — Overpass requests and matching
│   └── osmDoctors.test.js       NEW — local tests with sample OSM data
├── src/pages/
│   ├── ReportsPage.jsx          REPLACE — OSM cards, warnings, attribution
│   └── reports.css              REPLACE — mapped speciality badge styles
├── .env.example                 REPLACE — remove Google key
├── package.json                 REPLACE — adds test:osm (same dependencies)
├── README.md                    REPLACE (optional: merge if customized)
└── SETUP-OSM.md                 NEW — these instructions
```

**Do not overwrite other project folders**, your current `.env`, or team members' modified files without reviewing diffs first.

## Setup in VS Code (Mac/Linux)

1. Open the React project's own root folder (the folder with `package.json`). If inside the team monorepo, first `cd homepage` (or the name of the folder containing your code).
2. Install existing project dependencies:

```bash
npm install
```

3. If you do not have `.env`, make one:

```bash
cp .env.example .env
```

4. Inside `.env`, **remove** the old `GOOGLE_PLACES_API_KEY` entry. Example setup for **synthetic hackathon reports only**:

```env
XAI_API_KEY=your_real_xai_api_key
XAI_MODEL=grok-4.7
API_PORT=3001
ALLOW_DEMO_REPORTS=true
OVERPASS_API_URL=https://overpass-api.de/api/interpreter
VITE_REPORT_ANALYSIS_URL=
```

`OVERPASS_API_URL` is optional and defaults to the value above. **No OpenStreetMap account or API key is needed.** You still need a separately valid xAI key for PDF analysis, and xAI usage may cost money.

5. Start Vite + Express:

```bash
npm run dev:all
```

6. Visit `http://localhost:5173/reports-analysis`, choose a **synthetic sample** PDF, analyze it, and click **Find 5 options near me**. Allow browser location access when prompted. The browser's geolocation API works on HTTPS websites or `localhost`; it may not work on an ordinary HTTP network IP.

The existing `User1` / `0000` PIN is only a local UI demo, **not real authentication**. Never enable this anonymous demo API publicly with real patient documents.

## Test just the nearby-care backend

Test the Overpass matching/caching code without an account, API keys or dependencies:

```bash
npm run test:osm
npm run check:server
```

If the Express backend is running locally, you can test just the doctor finder without Grok using an example **public location, not your personal address**:

```bash
curl -s http://localhost:3001/api/doctors \
  -H 'Content-Type: application/json' \
  -d '{"latitude":28.6139,"longitude":77.2090,"specialty":"Cardiologist"}'
```

This requires `ALLOW_DEMO_REPORTS=true`. Unlike unit tests, this request uses the **real public Overpass service**, so it may return incomplete listings, 429, 504, or a temporary 503 message.

## How nearby matching works

- Overpass searches OSM objects tagged `amenity=doctors|clinic|hospital` or `healthcare=doctor|clinic|hospital`, including **nodes, ways and relations**.
- `out center tags` provides coordinates for mapped building outlines, not just points.
- OpenStreetMap `healthcare:speciality` tags are matched to the suggested specialty (e.g. `Cardiologist` → `cardiology`, `Hematologist` → `haematology`).
- Explicit matches are listed first, followed by general/untagged care options. Explicitly *different* specialties are excluded. Then practice/clinic/hospital and distance sort the list.
- Each listing identifies whether the specialty is **listed in OSM** or **unconfirmed**, not whether a physician's credentials are verified.
- Entries outside 15 km are removed; a maximum of five unique entries are displayed. Five is **not guaranteed**.
- Location is requested only when the person clicks the button. Backend sends ~2-decimal-degree rounded coordinates (~1 km precision) to Overpass. No PDF, blood value, or full user profile is included in the query. **The app server receives the selected specialty and location, which may be sensitive.** The public Overpass request does not include the specialty or the report.
- Searches for the same rounded area are cached in memory for 15 minutes; a short global gap reduces requests to public infrastructure. A request can still fail during peak load.
- OSM does not reliably list phone numbers, practitioner names, current opening hours, or credentials. Don't invent missing data or label a clinic as an individual doctor.

## GitHub commit (from the team's repository root)

After copying the changed files and testing, inspect with `git status` and commit only your homepage changes:

```bash
git status
git add homepage/server/ homepage/src/pages/ReportsPage.jsx homepage/src/pages/reports.css homepage/.env.example homepage/package.json homepage/README.md homepage/SETUP-OSM.md
git commit -m "feat: replace Places API with OpenStreetMap doctor finder"
git push origin main
```

If the home folder is named differently, replace `homepage/` in the `git add` command. If the main branch is protected, push a feature branch and open a pull request. **Never commit `.env`**.

## Deployment and limits

- Public Overpass instances are shared, **rate-limited, and not guaranteed to stay available**. Official OSM wiki lists its public main instance as suitable for modest usage, but not large production traffic.
- Search results are community data, and geographic coverage varies. You **must provide OpenStreetMap attribution**, included in the updated UI.
- Full-stack hosting needs the Express backend deployed as well; static-only Vite deployment won't run `/api/doctors` or `/api/analyze`.
- Real patient uploads require real auth, access controls, consent, retention/deletion policies, provider review and auditing. The Grok `attentionScore` remains a **non-validated** metric, not a clinical risk score.

## References

- Overpass API wiki: https://wiki.openstreetmap.org/wiki/Overpass_API
- Healthcare specialty tags: https://wiki.openstreetmap.org/wiki/Key:healthcare:speciality
- Doctor practice tags: https://wiki.openstreetmap.org/wiki/Tag:healthcare=doctor
- OSM attribution requirements: https://www.openstreetmap.org/copyright
