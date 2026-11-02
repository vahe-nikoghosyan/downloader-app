// Response of GET /api/health
export interface HealthResponse {
  status: "ok" | "degraded";
  uptimeSeconds: number;
  timestamp: string;
  services: {
    database: "up" | "down";
  };
}
