# Deploy on Vercel (Production)

This app is ready to run on Vercel, including GPX upload/import, if you configure Blob storage and env vars.

## 1) Prerequisites

- Vercel account
- Strava OAuth app
- Node.js 20+
- Vercel CLI (`npm i -g vercel`) optional but recommended

## 2) Connect project

1. Import the `web` directory as a Vercel project.
2. Framework preset: Next.js.
3. Build command: `npm run build`.
4. Output: default (`.next`).

## 3) Create Blob storage

Use Vercel dashboard or CLI:

```bash
vercel blob store create
```

Then attach the generated token as `BLOB_READ_WRITE_TOKEN` in project envs.

## 4) Set environment variables

Set these in Vercel for `Production` (and `Preview` if needed):

- `NEXT_PUBLIC_APP_URL=https://your-domain.com`
- `STRAVA_CLIENT_ID=...`
- `STRAVA_CLIENT_SECRET=...`
- `BLOB_READ_WRITE_TOKEN=...`

Important:
- `NEXT_PUBLIC_APP_URL` must match the public URL exactly (no trailing slash required).
- Update Strava callback URL to:
  `https://your-domain.com/api/admin/strava/callback`

## 5) Deploy

Push to main branch (Git integration) or run:

```bash
vercel --prod
```

## 6) Post-deploy smoke test

1. Open home page.
2. Open route details with GPX map.
3. Open admin page and upload `.gpx` file.
4. Connect Strava and import one activity.
5. Verify uploaded GPX URL is reachable and map renders track.

## 7) Known production notes

- GPX upload/import persistence on Vercel requires `BLOB_READ_WRITE_TOKEN`.
- Custom routes in admin are currently saved to browser `localStorage` (per-device), not a shared database.
- For multi-admin/team workflow, add a database layer for routes and admin auth.
