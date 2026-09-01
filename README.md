# FCUS - Safety Hub — Deploy Guide

This folder is a complete, ready-to-deploy web app (installable as a PWA on
any phone). You do not need to know how to code — just follow these steps.

## Fastest path: GitHub + Vercel (free, ~10 minutes, no terminal needed)

### 1. Put the code on GitHub
1. Go to https://github.com and create a free account if you don't have one.
2. Click the "+" in the top right → "New repository".
3. Name it `fcus-safety-hub`, leave it Public or Private (either
   works), click "Create repository".
4. On the new repo page, click "uploading an existing file".
5. Drag this entire folder's contents into the browser window and commit.

### 2. Deploy it with Vercel
1. Go to https://vercel.com and sign up free using your GitHub account.
2. Click "Add New" → "Project".
3. Select the `fcus-safety-hub` repo you just created.
4. Vercel auto-detects it's a Vite app — just click "Deploy".
5. In 1-2 minutes you'll get a live link like:
   `https://fcus-safety-hub.vercel.app`

That link is your real, live app. Anyone can open it on their phone.

### 3. Let crew "install" it (no App Store needed)
- **iPhone (Safari):** open the link → tap Share → "Add to Home Screen"
- **Android (Chrome):** open the link → tap the menu (⋮) → "Install app"

It'll behave like a normal app icon on their home screen from then on.

### 4. (Optional) Use your own domain
In Vercel: Project → Settings → Domains → add something like
`safety.ntisylvania.com` and point your DNS at it per Vercel's instructions.

## Database (Supabase)
Personnel login and Personnel Lookup now run on a real Supabase database
instead of Google Sheets — see `src/supabaseClient.js` for the connection.
Adding a new person means running an `insert into personnel (...)` in the
Supabase SQL Editor with a hashed PIN (`crypt('1234', gen_salt('bf'))`), not
editing a spreadsheet. Everything else (Bulletin, Emergency Contacts,
Orientation, Toolbox Talks, Work Plans, Safety Plan) is still on the
Google Sheets pattern for now — same as before.

## Updating content later
- Any time you want to change the safety manual, forms, toolbox talks, etc.,
  edit the Google Sheet links in `src/App.jsx` under `SHEET_URLS` (see the
  comments above that block for the exact column format each sheet needs).
- Push the change to GitHub (or just edit the file directly in GitHub's web
  editor) — Vercel automatically redeploys within a minute or two.

## What's in this folder
- `src/App.jsx` — the entire app (screens, forms, badge system, etc.)
- `src/main.jsx`, `src/index.css` — standard React/Tailwind entry points
- `vite.config.js` — build config, includes the PWA plugin so it's installable
- `tailwind.config.js`, `postcss.config.js` — styling setup
- `package.json` — the list of libraries it depends on

## Note on icons
`vite.config.js` references `icon-192.png` and `icon-512.png` in `public/`.
Add your own square logo at those two sizes to `public/` before deploying
(or ask me to generate placeholder ones) — otherwise the install prompt will
use a default icon.
