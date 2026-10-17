# DoosraJeevan — Master Homepage

A responsive, interactive healthcare homepage built with **React + Vite**, inspired by the provided DoosraJeevan mockup. It contains an editable SVG hero illustration, three service cards, search, mobile navigation, accessible links and temporary module pages.

## Run in VS Code

Requirements: Node.js 18+ and npm.

```bash
npm install
npm run dev
```

Open the local address printed by Vite (usually **http://localhost:5173**).

Build check:

```bash
npm run build
```

## Connect your three existing projects

Create a local `.env` file from `.env.example`:

```bash
cp .env.example .env
```

Then update the deployed URLs:

```env
VITE_NEUROSCAN_URL=https://your-neuroscan-site.example
VITE_ORGAN_DONATION_URL=https://your-organ-donation-site.example
VITE_REPORT_ANALYSIS_URL=https://your-report-analysis-site.example
```

Restart `npm run dev`. Until URLs are configured, the cards open **intentional local placeholder pages**, so there are no broken links. This homepage does **not** pretend that three separate apps or backends are already integrated.

To bring all three projects into **one GitHub repo** later, you can use this layout:

```
DoosraJeevan/
  apps/
    home/             # this Vite frontend
    neuroscan/        # first existing project
    organ-donation/   # second existing project
    reports-analysis/ # third existing project
  README.md
```

If the services use different runtimes, run them independently and route through a gateway or deploy each app separately. Do not merge their `package.json` files blindly or expose backend credentials in the frontend `.env` (all `VITE_` values are public).

## Push your first commit to GitHub

In the VS Code terminal, inside the extracted `DoosraJeevan` folder:

```bash
git init
git add .
git commit -m "feat: build DoosraJeevan master homepage"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

Create an **empty** GitHub repository first, and replace `YOUR_USERNAME/YOUR_REPO`. If you already cloned a repo, skip `git init` and `git remote add origin`; instead commit/push on the right branch. Authenticate using GitHub's supported method (such as Git Credential Manager or SSH), not your GitHub password.

## What's interactive?

- Brand/Home, About, Learn More and Get Started buttons navigate to real sections.
- The search icon opens a functional live filter of the three services.
- The service cards open the corresponding project URL or a friendly local placeholder.
- Sign In explains truthfully that shared authentication is **not yet connected**.
- Mobile menu, keyboard accessibility, clear responsive content and reduced-motion support.

## Files to edit

- `src/App.jsx` — homepage sections, search and navigation.
- `src/styles.css` — colors, responsiveness and visual style.
- `src/components/HeroArtwork.jsx` — faint interconnected doctor/brain/report artwork.
- `src/components/BrandLogo.jsx` — DoosraJeevan logo.
- `src/config/services.js` — names, descriptions and service routes.
- `public/favicon.svg` — browser tab logo.

**Health note:** The displayed content is informational. Model-powered results must not be represented as confirmed clinical diagnoses; implement appropriate authentication, consent, data retention policies and security safeguards before accepting real patient uploads.
