# RobloxGamingTracker

A private web app for tracking gaming stats for a friends-only leaderboard. Built with Next.js (App Router), TypeScript, Tailwind, PostgreSQL, Prisma, and Auth.js.

## Setup

1. **Clone and install**
   ```bash
   npm install
   ```

2. **Environment**
   - Copy `.env.example` to `.env`
   - Set `DATABASE_URL` (PostgreSQL)
   - Set `AUTH_SECRET` (e.g. `openssl rand -base64 32`)
   - For Google sign-in: set `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` (see [Google OAuth setup](#google-oauth-setup) below)
   - Optional: `ALLOWED_EMAILS` (comma-separated) to restrict access
   - Set `RIOT_API_KEY` from [Riot Developer Portal](https://developer.riotgames.com/)

3. **Database**
   ```bash
   npx prisma generate
   npx prisma db push
   # or: npx prisma migrate dev
   ```

4. **Run**
   ```bash
   npm run dev
   ```

## Google OAuth setup

1. Open [Google Cloud Console](https://console.cloud.google.com/) and create or select a project.
2. Go to **APIs & Services → Credentials** and click **Create credentials → OAuth client ID**.
3. If prompted, configure the **OAuth consent screen** (User type: External, then App name and support email).
4. Choose **Web application**, give it a name, and under **Authorized redirect URIs** add:
   - Local: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://your-domain.com/api/auth/callback/google`
5. Create and copy the **Client ID** and **Client secret** into `.env`:
   ```env
   AUTH_GOOGLE_ID="your-client-id.apps.googleusercontent.com"
   AUTH_GOOGLE_SECRET="your-client-secret"
   ```

Without these, the app falls back to dev login (any email + password `dev`).

## Docker

From the `my-app` directory, this runs **only PostgreSQL** in Docker; the app runs on your host.

```bash
docker compose up -d
```

Then in `my-app/.env` set:

```env
DATABASE_URL="postgresql://admin:password@localhost:5432/roblox-gaming-tracker?schema=public"
```

Apply the schema once:

```bash
npx prisma db push
```

And run the app locally:

```bash
npm run dev
```

## Project structure

- `app/` — App Router pages and API routes
  - `(dashboard)/` — Authenticated layout with sidebar (dashboard, players, settings)
  - `auth/` — Sign-in and error pages
  - `api/` — API routes (e.g. `/api/leaderboard`)
  - `actions/` — Server actions (add player, sync)
- `lib/` — Shared logic
  - `db.ts` — Prisma client
  - `leaderboard.ts` — Leaderboard and player-detail queries
  - `riot/` — Riot API service (account, summoner, league, match)
- `prisma/schema.prisma` — Database schema
- `components/` — UI (Sidebar, providers, etc.)
- `auth.ts` — Auth.js config

## Features

- **Auth**: Google sign-in via Auth.js; optional allowlist via `ALLOWED_EMAILS`
- **Players**: Add by Riot ID (gameName#tagLine) and region (na1, euw1, kr, …)
- **Sync**: Fetch current rank and recent ranked matches from Riot; stored in your DB
- **Leaderboard**: Solo queue rank ordered by tier/LP
- **Player profile**: Current rank, LP history, recent matches with KDA/cs/gold/damage

## Riot API

All Riot calls run on the server. The service layer in `lib/riot/` supports:

- account-v1 (by Riot ID)
- summoner-v4 (by puuid)
- league-v4 (ranked entries)
- match-v5 (match ids and match details)

Rate limits apply; sync sparingly or add a queue/cron for background sync.
