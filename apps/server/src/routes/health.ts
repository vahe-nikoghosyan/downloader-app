import type { FastifyPluginAsync } from "fastify";
import { sql } from "drizzle-orm";
import type { HealthResponse } from "@downloader/shared";

// GET /api/health: reports whether the server and its services are up.
// Returns 503 when a service is down, so Docker and load balancers can react.
export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get("/health", async (request, reply): Promise<HealthResponse> => {
    const database = await isDatabaseUp();
    const healthy = database;

    reply.code(healthy ? 200 : 503);
    return {
      status: healthy ? "ok" : "degraded",
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      services: {
        database: database ? "up" : "down",
      },
    };

    async function isDatabaseUp() {
      try {
        await app.db.execute(sql`select 1`);
        return true;
      } catch (error) {
        request.log.warn({ err: error }, "Database health check failed");
        return false;
      }
    }
  });
};
