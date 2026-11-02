import type { ApiErrorResponse } from "@downloader/shared";

// Where the Fastify API runs. Used by Server Components (code running on the Next.js server).
// The browser uses relative "/api/..." URLs instead, which next.config.ts forwards here.
export const API_URL = process.env.API_URL ?? "http://localhost:4000";

/** Reads the error message from an API error response, with a fallback. */
export async function readApiError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => null)) as ApiErrorResponse | null;
  return body?.error?.message ?? `Request failed (HTTP ${response.status})`;
}
