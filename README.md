# Downloader App

A fast downloader for open and public-domain content, built as a **Node.js + TypeScript monorepo**.

One REST API (Fastify) serves every client: the Next.js web app now, and a Telegram bot later.

## Structure

```
apps/
  server/        Fastify + TypeScript REST API          → http://localhost:4000/api
  web/           Next.js (App Router) frontend          → http://localhost:3000
packages/
  shared/        Types and logic shared by all apps (API contract)
```

### How the pieces talk

```
Browser ──► Next.js (:3000) ──/api/*──► Fastify (:4000)
Telegram bot (later) ─────────────────► Fastify (:4000)
```

Next.js forwards every `/api/*` request to Fastify (see `apps/web/next.config.ts`),
so the browser only talks to one address and no CORS setup is needed.

### Server vs client components (web)

- **Server Components** are the default. Use them for layout and static content (e.g. `app/page.tsx`).
- **Client Components** start with `"use client"`. Use them for state, events and browser APIs (e.g. `app/server-status.tsx`).

## Requirements

- Node.js 22+ (see `.nvmrc`)
- pnpm 10 (`corepack enable` installs the version pinned in `package.json`)

## Getting started

```bash
pnpm install
pnpm dev
```

`pnpm dev` builds `packages/shared` once, then runs everything in watch mode:
the API on port 4000 and the web app on port 3000.

Optional env files (copy from the examples):

- `apps/server/.env.example` → `apps/server/.env`
- `apps/web/.env.example` → `apps/web/.env`

## Scripts (run from the repo root)

| Command          | What it does                              |
| ---------------- | ----------------------------------------- |
| `pnpm dev`       | Run all apps in development (watch) mode  |
| `pnpm build`     | Build all packages and apps               |
| `pnpm start`     | Start the built apps (production mode)    |
| `pnpm typecheck` | Type-check every package                  |

Run a command in one app only with `--filter`, e.g. `pnpm --filter @downloader/server dev`.

## API

| Method | Path          | Description          |
| ------ | ------------- | -------------------- |
| GET    | `/api/health` | Server health check  |
