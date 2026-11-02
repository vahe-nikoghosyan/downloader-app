# syntax=docker/dockerfile:1
# Build from the repo root: docker build -f apps/web/Dockerfile .

FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /repo

# ---- Build ----
FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm fetch
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --offline
# Where the web app forwards /api/* (baked in at build time).
ARG API_URL=http://server:4000
ENV API_URL=$API_URL
# Build the web app and the workspace packages it depends on.
RUN pnpm --filter "@downloader/web..." build

# ---- Runtime: Next.js standalone output (no full node_modules needed) ----
FROM node:22-alpine AS runtime
ARG API_URL=http://server:4000
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Server Components call the API directly at request time.
ENV API_URL=$API_URL
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
WORKDIR /app
COPY --from=build --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
