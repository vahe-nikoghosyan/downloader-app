// Response of GET /api/health
export interface HealthResponse {
  status: "ok";
  uptimeSeconds: number;
  timestamp: string;
}
