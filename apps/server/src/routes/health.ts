import type { FastifyPluginAsync } from "fastify";
import type { HealthResponse } from "@downloader/shared";

// GET /api/health: a simple check that the server is up.
export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get("/health", async (): Promise<HealthResponse> => {
    return {
      status: "ok",
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  });
};
