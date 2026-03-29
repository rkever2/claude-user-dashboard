# Claude Code Usage Dashboard

## What This Is

A read-only dashboard that visualizes Claude Code CLI usage from local `~/.claude/` files. Shows token usage, costs, sessions, projects, model breakdown, and activity trends. All data is local — no cloud API calls.

## Tech Stack

- **Server**: Hono (Node.js), TypeScript, ESM modules
- **Client**: React 19, Vite, TanStack Query, Recharts, Tailwind CSS v4
- **Deployment**: Docker (multi-stage build), single container serves both API and static client
- **Types**: Shared via `shared/types.ts` — this file must stay in sync with `server/src/types.ts`

## Project Structure

```
server/src/
  config.ts          — env var config (CLAUDE_DATA_DIR, PORT)
  index.ts           — Hono app, routes, health endpoint, startup validation
  errors.ts          — AppError class for typed HTTP errors
  types.ts           — all shared TypeScript interfaces (canonical source)
  routes/            — one file per API endpoint (overview, activity, models, costs, insights, sessions, projects)
  parsers/
    stats-cache.ts   — reads stats-cache.json + merges fresh JSONL data
    stats-from-jsonl.ts — scans JSONL session files for data newer than the cache
    session-jsonl.ts — parses individual session JSONL files
    sessions-index.ts — reads sessions-index.json files across projects
  services/
    cost-calculator.ts — token pricing and model display names

client/src/
  pages/             — one page per nav route
  components/        — layout (header, nav, shell) and ui (data-table, stat-card, etc.)
  charts/            — Recharts wrappers (area, bar, donut, line)
  hooks/use-queries.ts — TanStack Query hooks for each API endpoint
  lib/api.ts         — fetch wrapper with ApiError class
  lib/colors.ts      — chart color palette
  lib/format.ts      — number/date/token formatting utilities

shared/types.ts      — copy of server/src/types.ts for client imports via @shared/*
```

## Data Flow

1. Claude Code CLI writes session data to `~/.claude/projects/*/\*.jsonl` and a pre-computed `~/.claude/stats-cache.json`
2. `getStatsCache()` reads `stats-cache.json` as a baseline, then calls `computeStatsFromJsonl()` to scan JSONL files modified after the cache's `lastComputedDate`
3. `mergeStats()` combines cached + fresh data, avoiding double-counting by filtering messages by date
4. Results are cached in-memory for 60 seconds (`config.cacheTtlMs`)
5. Routes transform the StatsCache into endpoint-specific response shapes
6. Client fetches via `/api/*` endpoints, TanStack Query handles caching/staleness

## Key Conventions

- **calculateCost()** takes a named `TokenCounts` object, not positional args
- **getModelDisplayName()** in `cost-calculator.ts` is the single source of truth for model name mapping
- **shared/types.ts** must be kept in sync with `server/src/types.ts` — copy after any type changes
- **AppError** for server errors (includes HTTP status code), **ApiError** on the client
- Routes return typed response interfaces from `types.ts` — don't add ad-hoc fields
- Path validation: `parseSessionJsonl()` validates paths are within `config.claudeDataDir`
- No API keys or cloud API calls — everything reads from local files

## Running Locally

```bash
# Docker (recommended)
docker compose up --build
# Open http://localhost:3080

# Dev mode (two terminals)
cd server && CLAUDE_DATA_DIR=$HOME/.claude npm run dev
cd client && npm run dev
# Open http://localhost:5173 (Vite proxies /api to :3080)
```

## Verification After Changes

1. `cd server && npx tsc --noEmit` — server compiles
2. `cd client && npx tsc --noEmit` — client compiles
3. `docker compose up --build` — full build passes
4. `curl localhost:3080/api/health` — returns `status: "ok"`
5. `curl localhost:3080/api/activity?range=7d` — returns recent daily data
6. If you changed `server/src/types.ts`, copy it to `shared/types.ts`

## Common Pitfalls

- **Stale shared types**: If the client shows type errors after server type changes, sync `shared/types.ts`
- **Docker data dir**: Inside the container, `CLAUDE_DATA_DIR=/data/claude` (mounted from host `~/.claude`). When running locally, set `CLAUDE_DATA_DIR=$HOME/.claude` explicitly
- **JSONL scanning**: Only scans top-level `.jsonl` files in project dirs, not `subagents/` subdirs (those tokens are already counted in the parent session)
- **Date boundary**: `computeStatsFromJsonl` uses `messageDate <= afterDate` to skip already-cached data. Changing this to `<` would double-count the boundary day
