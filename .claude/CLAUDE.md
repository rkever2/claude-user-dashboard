# Claude Code Usage Dashboard

## Project Overview
React + Hono dashboard for visualizing Claude Code CLI usage. Runs locally via Docker.

## Tech Stack
- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS v4, Recharts, TanStack Query
- **Backend**: Hono (Node.js), TypeScript
- **Container**: Docker with multi-stage build, node:22-alpine

## Key Conventions
- Swiss design: no border-radius (enforced via `* { border-radius: 0 !important; }`), uppercase labels, muted borders
- Dark mode is the default theme
- All pages follow the pattern: Header + content area with border-bordered cards/tables
- Tables use the `DataTable` component with optional sort support
- Filtering uses `MultiSelectFilter` component for multi-select dropdowns
- Charts use Recharts (AreaChart, BarChart, DonutChart wrapper components)
- API layer: `client/src/lib/api.ts` with `fetchApi`/`postApi` helpers
- Query hooks: `client/src/hooks/use-queries.ts` using TanStack Query
- Server routes: `server/src/routes/*.ts` as Hono sub-apps

## Development Workflow
- Feature branches from `main`, PRs via `gh pr create`
- After code changes, rebuild Docker: `docker compose down && docker compose up --build -d`
- Client dev server: `cd client && npm run dev` (port 5173, proxies to 3080)
- Server dev server: `cd server && CLAUDE_DATA_DIR=~/.claude npm run dev` (port 3080)

## Data Sources
- Local: `~/.claude/stats-cache.json`, `~/.claude/projects/*/sessions-index.json`
- API: Anthropic Admin API (optional, auto-detected from ANTHROPIC_ADMIN_API_KEY)

## GitHub
- Repo: rkever2/claude-user-dashboard
