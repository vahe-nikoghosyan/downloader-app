import Fastify from "fastify";
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from "fastify-type-provider-zod";
import { config } from "./config.js";
import { mediaRoutes } from "./modules/media/media.routes.js";
import { dbPlugin } from "./plugins/db.js";
import { errorHandlerPlugin } from "./plugins/error-handler.js";
import { healthRoutes } from "./modules/health/health.routes.js";

// Builds the Fastify app without starting it.
// Keeping this separate from index.ts makes it easy to reuse (e.g. scripts, a future bot process).
export function buildApp() {
  const app = Fastify({
    logger: {
      level: config.logLevel,
      // Pretty, readable logs in development; fast JSON logs in production.
      transport: config.isProduction ? undefined : { target: "pino-pretty" },
      // Download tokens are long and not useful in logs.
      redact: { paths: ["req.query.token"], remove: true },
    },
  }).withTypeProvider<ZodTypeProvider>();

  // Validate requests with zod schemas (route handlers get fully typed input).
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Plugins: shared resources and behavior
  app.register(errorHandlerPlugin);
  app.register(dbPlugin);

  // Routes: every API route is served under /api
  app.register(healthRoutes, { prefix: "/api" });
  app.register(mediaRoutes, { prefix: "/api" });

  return app;
}
