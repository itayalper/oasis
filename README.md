# IdentityHub — Oasis

A multi-tenant ticket management app that bridges your team's security findings to Jira.

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 20+ | `node --version` |
| Yarn | 1.x (Classic) | `npm i -g yarn` |
| Docker + Docker Compose | any recent | Required for the postgres container (or local dev path below) |

---

## Option A — Docker Compose (recommended)

Everything runs in containers: PostgreSQL, backend, and frontend (nginx).

### 1. Clone and install

```bash
git clone <repo-url> oasis
cd oasis
yarn install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

The `.env.example` already contains sample generated values. For a real deployment
**regenerate both secrets** so they are unique to your environment:

```bash
# SESSION_SECRET — any random string, min 32 chars
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# JIRA_ENCRYPTION_KEY — exactly 64 hex chars (32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Paste the outputs into `.env`:

```
SESSION_SECRET=<your generated value>
JIRA_ENCRYPTION_KEY=<your generated value>
```

> Never commit `.env` to source control. It is already in `.gitignore`.

### 3. Start the stack

```bash
docker-compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3001 |
| PostgreSQL | localhost:5432 (user: `postgres`, pass: `postgres`, db: `oasis`) |

The backend runs database migrations automatically on startup.

### 4. Stop

```bash
docker-compose down          # stop containers, keep data volume
docker-compose down -v       # stop and delete the postgres volume (full reset)
```

---

## Option B — Local development (hot reload)

Use this when you want fast iteration with TypeScript watch mode.

### 1. Start PostgreSQL only

```bash
docker-compose up postgres
```

Or point `DATABASE_URL` in `.env` to any PostgreSQL 14+ instance you already have running.

### 2. Install dependencies

```bash
yarn install
```

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env — DATABASE_URL should point to localhost:5432
```

The default `DATABASE_URL` in `.env.example` already targets `localhost:5432`.

### 4. Run migrations

```bash
yarn workspace backend migrate:up
```

### 5. Start dev servers

```bash
yarn dev
```

This starts both servers concurrently with hot reload:

| Process | URL |
|---------|-----|
| Frontend (Vite) | http://localhost:5173 |
| Backend (ts-node-dev) | http://localhost:3001 |

---

## Environment variables reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | JWT signing secret — any string, min 32 chars |
| `SESSION_TTL_SECONDS` | No | JWT expiry in seconds (default: `86400` = 24 h) |
| `JIRA_ENCRYPTION_KEY` | Yes | AES-256-GCM key for Jira tokens — exactly 64 hex chars |
| `PORT` | No | Backend listen port (default: `3001`) |
| `NODE_ENV` | No | `development` or `production` |
| `MAX_JIRA_CONNECTIONS_PER_TENANT` | No | Guard rail for Jira connections per tenant (default: `10`) |

---

## Build (CI / production image)

```bash
yarn build                          # compiles backend (tsc) + frontend (vite)
docker-compose up --build           # builds images then starts the stack
```

---

## Project structure

```
oasis/
├── packages/
│   ├── backend/          # Node 20 + Express + TypeScript
│   │   ├── src/
│   │   │   ├── server.ts         # entry point
│   │   │   ├── app.ts            # Express app setup
│   │   │   ├── config/env.ts     # validated env loader
│   │   │   ├── db/               # pg client + migration runner
│   │   │   ├── routes/           # Express routers
│   │   │   ├── handlers/         # request handlers
│   │   │   ├── services/         # business logic
│   │   │   ├── dal/              # data access layer
│   │   │   ├── middleware/       # auth, API key guards
│   │   │   ├── schemas/          # AJV validation schemas
│   │   │   └── utils/            # crypto helpers
│   │   └── migrations/sqls/      # db-migrate SQL files
│   ├── frontend/         # React 18 + Vite + React Router v6
│   │   └── src/
│   │       ├── pages/
│   │       ├── components/
│   │       ├── hooks/
│   │       └── api/
│   └── automation/       # NHI Blog Digest cron script
│       ├── src/
│       │   ├── digest.ts         # entry point / orchestrator
│       │   ├── blog-fetcher.ts   # scrape oasis.security/blog
│       │   ├── summariser.ts     # Claude AI summary
│       │   ├── ticket-creator.ts # POST /api/v1/tickets
│       │   └── db.ts             # blog_digests DAL
│       └── cron.env              # env file (gitignored)
├── docker-compose.yml
├── .env
└── package.json          # yarn workspace root
```

---

## NHI Blog Digest (Automation)

A standalone cron script that monitors the [Oasis Security blog](https://www.oasis.security/blog),
generates an AI-powered summary of the most recent post using Claude, and automatically files a
Jira ticket via the existing external API. Each processed post is tracked in the `blog_digests`
table so duplicates are never created.

### Prerequisites

In addition to the main stack prerequisites:

- An **Anthropic API key** — obtain from [console.anthropic.com](https://console.anthropic.com)
- A **Digest API key** — generate one from the app UI under **Settings → API Keys**
- The backend must be running and reachable at `DIGEST_BACKEND_URL`

### 1. Set up `cron.env`

```bash
cp packages/automation/cron.env packages/automation/cron.env
# (the file is already created — just fill in the values)
```

Edit `packages/automation/cron.env`:

```
# Copy from your root .env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/oasis
JIRA_ENCRYPTION_KEY=<copy from .env>

# New values
ANTHROPIC_API_KEY=<your Anthropic API key>
DIGEST_BACKEND_URL=http://localhost:3001
DIGEST_API_KEY=<raw API key from the UI>
DIGEST_JIRA_PROJECT=<Jira project key, e.g. SEC>
```

> `cron.env` is gitignored and never committed.

### 2. Install dependencies

```bash
yarn install   # from the repo root — picks up the new automation workspace
```

### 3. Run manually

```bash
yarn workspace automation digest
```

Expected output for a new post:

```
[digest] Starting NHI Blog Digest run…
[digest] Fetching latest post from oasis.security/blog…
[digest] Found: "Inside Oasis's NHI Enrichment Layer…" — https://www.oasis.security/blog/…
[digest] Inserted blog_digests row <uuid> (status: pending)
[digest] Generating AI summary via Claude…
[digest] Summary generated (severity: LOW, priority: Low)
[digest] Creating Jira ticket…
[digest] Done. Ticket created: SEC-42 — https://…/browse/SEC-42
```

If the latest post was already processed:

```
[digest] Already processed (status: ticketed) — skipping.
```

### 4. Monitor processing status

Query the `blog_digests` table directly:

```sql
SELECT post_title, status, jira_issue_key, jira_url, error_msg, created_at
FROM blog_digests
ORDER BY created_at DESC;
```

| status | meaning |
|--------|---------|
| `pending` | Fetched; summary not yet generated |
| `summarised` | Claude summary done; ticket not yet created |
| `ticketed` | Jira ticket created successfully |
| `failed` | An error occurred — see `error_msg` column |

### 5. Schedule with system cron

Run daily at 08:00:

```cron
0 8 * * * cd /path/to/oasis && yarn workspace automation digest >> /var/log/nhi-digest.log 2>&1
```

### 6. Schedule with GitHub Actions

Create `.github/workflows/nhi-digest.yml`:

```yaml
name: NHI Blog Digest

on:
  schedule:
    - cron: '0 8 * * *'   # daily at 08:00 UTC
  workflow_dispatch:        # allow manual trigger

jobs:
  digest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: yarn install --frozen-lockfile
      - run: yarn workspace automation digest
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          JIRA_ENCRYPTION_KEY: ${{ secrets.JIRA_ENCRYPTION_KEY }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          DIGEST_BACKEND_URL: ${{ secrets.DIGEST_BACKEND_URL }}
          DIGEST_API_KEY: ${{ secrets.DIGEST_API_KEY }}
          DIGEST_JIRA_PROJECT: ${{ secrets.DIGEST_JIRA_PROJECT }}
```

---

## Useful commands

```bash
# TypeScript type-check (no emit)
yarn workspace backend tsc --noEmit

# Create a new migration
yarn workspace backend migrate:create -- --name <migration-name>

# Roll back the last migration
yarn workspace backend migrate:down
```
