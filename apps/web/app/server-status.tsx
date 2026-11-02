"use client";

import { useEffect, useState } from "react";
import type { HealthResponse } from "@downloader/shared";

// Client Component: needs state and effects, so it runs in the browser.
// Calls /api/health, which Next.js forwards to the Fastify server.
export function ServerStatus() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    // 503 still has a useful body (e.g. database down), so read JSON for any response.
    fetch("/api/health")
      .then((response) => response.json() as Promise<HealthResponse>)
      .then(setHealth)
      .catch(() => setError(true));
  }, []);

  if (error) return <p>API: unreachable</p>;
  if (!health) return <p className="muted">API: checking…</p>;
  return (
    <p>
      API: {health.status} (up {health.uptimeSeconds}s) · Database: {health.services.database}
    </p>
  );
}
