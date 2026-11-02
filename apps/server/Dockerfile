# syntax=docker/dockerfile:1
# Build from the repo root: docker build -f apps/server/Dockerfile .

FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /repo

# ---- Build: install deps, compile TypeScript, collect production files ----
FROM base AS build
# Download dependencies first (cached unless the lockfile changes).
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm fetch
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --offline
# Build the server and the workspace packages it depends on.
RUN pnpm --filter "@downloader/server..." build
# Copy the server + production dependencies only into /out.
RUN pnpm deploy --legacy --filter @downloader/server --prod /out

# ---- Runtime: small image with only what is needed to run ----
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /out ./
USER node
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/api/health > /dev/null || exit 1
CMD ["node", "dist/index.js"]
