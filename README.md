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

Each layer has one job, so functions stay short:

```
Request → Route → Service → Provider → Downloader → Response
```

```
index.ts              Starts the server, graceful shutdown
app.ts                Builds the app: registers plugins and routes
config.ts             Reads and validates environment variables (zod)
modules/              One folder per feature
  media/
    media.routes.ts     HTTP only: validate input, call the service, send the result
    media.schemas.ts    Input validation (zod)
    media.service.ts    The steps of each use case (no HTTP details)
  health/
    health.routes.ts
providers/            One file per site: "where are the media files for this link?"
  provider.ts           The interface every provider follows
  registry.ts           Picks the provider for a link (generic one last)
  wikimedia.ts          Wikimedia Commons / Wikipedia file pages
  nasa.ts               NASA Image and Video Library
  direct.ts             Direct links to image/video files
lib/                  Shared building blocks
  http.ts               The only way to call external sites (SSRF protection, timeouts)
  downloader.ts         Streams files, enforces size and type limits
  download-token.ts     Signed, expiring download links
  url.ts                Link parsing and safety checks
  files.ts              File names and media types
  errors.ts             AppError and friends → turned into JSON by the error handler
plugins/
  db.ts                 Database as `app.db`
  error-handler.ts      One place that formats every error response
```

Routes never use try/catch: services throw an `AppError` (e.g. `NotFoundError`) and the error
handler turns it into `{ "error": { "code", "message" } }` with the right status code.

### Adding a new site (provider)

1. Create `apps/server/src/providers/<site>.ts` implementing `Provider`:
   - `canHandle(url)`: is this link from my site?
   - `resolve(url)`: return the direct file URLs (best quality first). Use `fetchJson` from `lib/http.ts`
     and validate the response with a zod schema.
2. Add it to the list in `providers/registry.ts`.

Providers never download files themselves. `lib/downloader.ts` does that for every provider.

### Security built in

- **SSRF protection**: the server only fetches public `http(s)` addresses on standard ports. Private, local
  and cloud-metadata addresses are blocked, both in the URL and after DNS lookup (also on every redirect).
- **Signed download links**: `/api/media/download` only serves files that a provider resolved, through
  an HMAC-signed token that expires after 1 hour. The server can't be used as an open proxy.
- **Limits**: only images and videos, up to `MAX_DOWNLOAD_MB`, with connection and idle timeouts.

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

Open http://localhost:3000, paste a link (e.g. a Wikimedia Commons file page or a direct image link) and download it.

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
cp .env.example .env   # set a strong POSTGRES_PASSWORD and DOWNLOAD_TOKEN_SECRET
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
| `DOWNLOAD_TOKEN_SECRET` | server       | Signs download links (`openssl rand -hex 32`) |
| `MAX_DOWNLOAD_MB`   | server           | Largest file the server will download         |
| `HTTPS_PROXY`       | server           | Optional proxy for requests to external sites |
| `API_URL`           | web              | Where the API runs (rewrites + Server Components) |

## API

All errors have the shape `{ "error": { "code": "UNSUPPORTED_URL", "message": "..." } }`.
Types for every request and response are in `packages/shared/src/api.ts`.

| Method | Path                           | Description                                                  |
| ------ | ------------------------------ | ------------------------------------------------------------ |
| GET    | `/api/health`                  | Server and database status (`503` if a service is down)      |
| GET    | `/api/media/providers`         | Supported sites, with an example link for each              |
| POST   | `/api/media/resolve`           | Body `{ "url": "..." }` → media found, best quality first   |
| GET    | `/api/media/download?token=…`  | Streams a file (use the `downloadUrl` from `resolve`)       |

Example:

```bash
curl -X POST http://localhost:4000/api/media/resolve \
  -H 'content-type: application/json' \
  -d '{"url":"https://commons.wikimedia.org/wiki/File:The_Earth_seen_from_Apollo_17.jpg"}'
```

Common error codes: `VALIDATION_ERROR`, `INVALID_URL`, `URL_NOT_ALLOWED` (400), `INVALID_DOWNLOAD_LINK` (403),
`NOT_FOUND` (404), `FILE_TOO_LARGE` (413), `UNSUPPORTED_MEDIA` (415), `UNSUPPORTED_URL` (422), `UPSTREAM_ERROR` (502).
