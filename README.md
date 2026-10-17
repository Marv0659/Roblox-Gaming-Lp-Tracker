# RobloxGamingTracker

A private League of Legends ranked tracker for a friends-only leaderboard. Built with Next.js (App Router), TypeScript, Tailwind, PostgreSQL and Prisma.

There is currently **no login** — anyone with the URL can view pages and trigger syncs.

## Setup

1. **Clone and install**
   ```bash
   npm install
   ```

2. **Environment** (`.env`)
   - `DATABASE_URL` — PostgreSQL connection string
   - `RIOT_API_KEY` — from the [Riot Developer Portal](https://developer.riotgames.com/)
   - `CRON_SECRET` — bearer token required by `/api/cron/sync`

3. **Database**
   ```bash
   npx prisma generate
   npx prisma migrate deploy
   ```

4. **Run**
   ```bash
   npm run dev
   ```

5. **Test**
   ```bash
   npm test
   ```

## Docker

From the `my-app` directory, this runs **only PostgreSQL** in Docker; the app runs on your host.

```bash
docker compose up -d
```

Then in `my-app/.env` set:

```env
DATABASE_URL="postgresql://admin:password@localhost:5432/roblox-gaming-tracker?schema=public"
```

## Background sync

`GET /api/cron/sync` with `Authorization: Bearer <CRON_SECRET>`:

- default — syncs every player (can take minutes; needs a long timeout)
- `?mode=step` — syncs one player per request, rotating through the roster (fits a 30s timeout)

Every run is recorded in the `SyncLog` table and the latest runs are shown on the Settings page.

Manual syncs of a single player are throttled to one per `MANUAL_SYNC_COOLDOWN_MS` (2 minutes).

## Project structure

- `app/(dashboard)/` — pages (leaderboard, players, recaps, halls, champion trust, settings)
- `app/actions/` — server actions (add player, sync)
- `app/api/` — route handlers (cron sync, leaderboard JSON)
- `lib/riot/` — Riot API client (account, summoner, league, match, challenges)
- `lib/*.ts` — stats logic; pure functions are covered by tests in `lib/__tests__/`
- `prisma/schema.prisma` — database schema

## Riot API

All Riot calls run on the server. `lib/riot/client.ts` retries 429s (honouring `Retry-After`) and 503s. Match sync is incremental: it only lists games after the newest one stored, and only downloads match details that are not already fully stored.
