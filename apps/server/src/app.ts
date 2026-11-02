import Fastify from "fastify";
import { config } from "./config.js";
import { healthRoutes } from "./routes/health.js";

// Builds the Fastify app without starting it.
// Keeping this separate from index.ts makes it easy to reuse (e.g. scripts, a future bot process).
export function buildApp() {
  const app = Fastify({
    logger: {
      level: config.logLevel,
      // Pretty, readable logs in development; fast JSON logs in production.
      transport: config.isProduction ? undefined : { target: "pino-pretty" },
    },
  });

  // Every API route is served under /api
  app.register(healthRoutes, { prefix: "/api" });

  return app;
}
