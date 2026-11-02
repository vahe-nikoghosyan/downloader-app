# Downloader App

A fast downloader for open and public-domain content, built as a **Node.js + TypeScript monorepo**.

One REST API (Fastify) serves every client: the Next.js web app now, and a Telegram bot later.

## Structure

```
apps/
  server/        Fastify + TypeScript REST API          → http://localhost:4000/api
  web/           Next.js (App Router) frontend          → http://localhost:3000
packages/
  shared/        Types shared by all apps (the API contract)
  db/            PostgreSQL access: Drizzle schema, client, migrations
compose.yaml       Local dev services (Postgres)
compose.prod.yaml  Full stack in Docker (production-like)
```

### How the pieces talk

```
Browser ──► Next.js (:3000) ──/api/*──► Fastify (:4000) ──► PostgreSQL
Telegram bot (later) ─────────────────► Fastify (:4000)
```

Next.js forwards every `/api/*` request to Fastify (see `apps/web/next.config.ts`),
so the browser only talks to one address and no CORS setup is needed.

### Server vs client components (web)

- **Server Components** are the default. Use them for layout and static content (e.g. `app/page.tsx`).
- **Client Components** start with `"use client"`. Use them for state, events and browser APIs (e.g. `app/server-status.tsx`).

### Server layout (`apps/server/src`)

| Path         | Purpose                                                      |
| ------------ | ------------------------------------------------------------ |
| `index.ts`   | Starts the server, handles graceful shutdown                 |
| `app.ts`     | Builds the Fastify app: registers plugins and routes         |
| `config.ts`  | Reads and validates environment variables (zod)              |
| `plugins/`   | Shared resources, e.g. `db.ts` exposes the database as `app.db` |
| `routes/`    | API endpoints, served under `/api`                           |

## Requirements

- Node.js 22+ (see `.nvmrc`)
- pnpm 10 (`corepack enable` installs the version pinned in `package.json`)
- Docker (for Postgres locally, and for deployment)

## Getting started

```bash
pnpm install
cp .env.example .env
pnpm db:up        # start Postgres in Docker
pnpm db:migrate   # apply database migrations
pnpm dev          # API on :4000, web on :3000
```

Open http://localhost:3000. The page shows whether the API and the database are up.

## Database

PostgreSQL with [Drizzle ORM](https://orm.drizzle.team). Everything lives in `packages/db`:

1. Define or change tables in `packages/db/src/schema.ts`.
2. `pnpm db:generate` creates a SQL migration in `packages/db/drizzle/` (commit it).
3. `pnpm db:migrate` applies pending migrations.

Use it in the server through `app.db` (or `request.server.db` inside a route).
Write column names in camelCase in TypeScript; they are stored as snake_case in Postgres.

`pnpm db:studio` opens a browser UI to look at the data.

## Scripts (run from the repo root)

| Command            | What it does                                        |
| ------------------ | --------------------------------------------------- |
| `pnpm dev`         | Run all apps in development (watch) mode            |
| `pnpm build`       | Build all packages and apps                         |
| `pnpm start`       | Start the built apps (production mode)              |
| `pnpm typecheck`   | Type-check every package                            |
| `pnpm db:up`       | Start local Postgres (Docker)                       |
| `pnpm db:down`     | Stop local Postgres (data is kept)                  |
| `pnpm db:generate` | Create a migration from schema changes              |
| `pnpm db:migrate`  | Apply pending migrations                            |
| `pnpm db:studio`   | Browse the database in the browser                  |
| `pnpm docker:up`   | Build and run the full stack in Docker              |
| `pnpm docker:down` | Stop the full Docker stack                          |
| `pnpm docker:logs` | Follow logs of the full Docker stack                |

Run a command in one app only with `--filter`, e.g. `pnpm --filter @downloader/server dev`.

## Docker / deployment

`compose.prod.yaml` runs everything in containers:

1. `postgres` starts and waits until healthy.
2. `migrate` applies database migrations and exits.
3. `server` starts after migrations succeed.
4. `web` starts once the server is healthy.

To deploy on a server (any VPS with Docker):

```bash
git clone <repo> && cd downloader-app
cp .env.example .env   # set a strong POSTGRES_PASSWORD
pnpm docker:up         # or: docker compose -f compose.prod.yaml up -d --build
```

Images are multi-stage builds that contain only production files and run as a non-root user.
For a public deployment, put a reverse proxy with HTTPS (e.g. Caddy) in front of port 3000.

## Environment variables

All settings live in the root `.env` (see `.env.example`). The server validates them on startup
and refuses to start with a clear message if something is missing.

| Variable            | Used by          | Description                                   |
| ------------------- | ---------------- | --------------------------------------------- |
| `DATABASE_URL`      | server, db       | Postgres connection string (local dev)        |
| `POSTGRES_*`        | Docker Compose   | Database user, password, name, local port     |
| `HOST`, `PORT`      | server           | Where the API listens (default `0.0.0.0:4000`) |
| `LOG_LEVEL`         | server           | `info`, `debug`, …                            |
| `API_URL`           | web (build time) | Where Next.js forwards `/api/*`               |

## API

| Method | Path          | Description                                                  |
| ------ | ------------- | ------------------------------------------------------------ |
| GET    | `/api/health` | Server and database status (`503` if a service is down)      |
