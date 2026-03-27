# Claude Code Usage Dashboard

A local dashboard for visualizing your Claude Code CLI usage. Supports two modes: **local-only** (reads `~/.claude/` files on this machine) or **API mode** (pulls org-wide usage from the Anthropic Admin API across all devices).

## Prerequisites

- **Docker** (and Docker Compose)
- **Claude Code CLI** — you must have used it at least once so `~/.claude/` contains usage data

## Quick Start

```bash
# 1. Copy the example env file
cp .env.example .env

# 2. (Optional) Edit .env to choose your data source mode

# 3. Build and run
docker compose up --build
```

Open [http://localhost:3080](http://localhost:3080) in your browser.

## Configuration

### Option 1: Local Only (default)

Reads usage data directly from `~/.claude/` on this machine. No API key needed. Only shows stats for the current device.

```bash
# .env
DATA_SOURCE_MODE=local
CLAUDE_DATA_DIR=~/.claude
PORT=3080
```

This is the default — just copy `.env.example` to `.env` and run. The `CLAUDE_DATA_DIR` is mounted **read-only** inside the container.

### Option 2: API Mode (all devices)

Uses the [Anthropic Admin API](https://docs.anthropic.com/en/api/admin-api) to pull org-wide usage across all devices. Local `~/.claude/` data is still used for session-level detail (project names, branches, conversation logs) since the API doesn't provide that granularity.

```bash
# .env
DATA_SOURCE_MODE=api
CLAUDE_DATA_DIR=~/.claude
ANTHROPIC_ADMIN_API_KEY=sk-ant-admin-...
PORT=3080
```

**To get your Admin API key:**

1. Go to [console.anthropic.com/settings/admin-keys](https://console.anthropic.com/settings/admin-keys)
2. Sign in with your Anthropic account (requires **org admin** role)
3. Click **Create Key**
4. Copy the key (starts with `sk-ant-admin-...`) and paste it into `.env`

**What API mode adds:**

| Feature | Local Only | API Mode |
|---------|-----------|----------|
| Token usage (this device) | Yes | Yes |
| Token usage (all devices) | No | Yes |
| Session details (project, branch, prompts) | Yes | Yes |
| Model breakdown | Yes | Yes |
| Actual org-wide usage totals | No | Yes |
| Per-device filtering | N/A | Yes |

> **Note:** The API provides org-level aggregates (tokens by model, by day, by workspace). It does not inherently identify which device made a request. Device-level detail comes from local `~/.claude/` files on each machine.

## Pages

- **Overview** — KPI summary: input/output tokens, sessions, messages, avg messages/session, cache hit rate. Top projects table and model distribution donut chart.
- **Activity** — Daily output tokens by model (stacked area chart), sessions and messages over time. Filterable by date range.
- **Projects** — Sessions per project bar chart, project table with branches, message counts, and date ranges.
- **Models** — Token distribution donut chart, detailed breakdown table per model with input/output/cache tokens.
- **Sessions** — Sortable list of all sessions with project, branch, message count, and first prompt.
- **Insights** — Cache hit rate, average messages per session, peak usage hour, session-start-by-hour bar chart, and longest session stats.

## Development

Run the server and client separately for hot-reload:

```bash
# Terminal 1: Server
cd server
npm install
CLAUDE_DATA_DIR=~/.claude npm run dev

# Terminal 2: Client
cd client
npm install
npm run dev
```

Client runs on http://localhost:5173 and proxies API requests to the server on port 3080.

## Tech Stack

- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS v4, Recharts, TanStack Query
- **Backend**: Hono (Node.js), TypeScript
- **Container**: Docker with multi-stage build, `node:22-alpine`

## Data Sources

**Local files** (always read, both modes):

| File | Content |
|------|---------|
| `stats-cache.json` | Aggregated daily activity, model tokens, session counts, hour distribution |
| `projects/*/sessions-index.json` | Per-project session metadata (branch, timestamps, message counts) |
| `projects/*/*.jsonl` | Full conversation logs (parsed on-demand for session detail) |

**Anthropic Admin API** (API mode only):

| Endpoint | Content |
|----------|---------|
| `/v1/organizations/usage_report/messages` | Daily token usage by model across all devices |
| `/v1/organizations/cost_report` | Org-wide cost data |
