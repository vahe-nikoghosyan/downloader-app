import path from "node:path";
import type { NextConfig } from "next";

// Note: rewrites are resolved at build time, so API_URL must be set when running `next build`.
const apiUrl = process.env.API_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  // Self-contained production build (used by the Docker image).
  output: "standalone",
  // Monorepo root, so the standalone build includes workspace packages like @downloader/shared.
  outputFileTracingRoot: path.join(process.cwd(), "../.."),

  // Forward /api/* to the Fastify server, so the browser talks to one address (no CORS setup needed).
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiUrl}/api/:path*` }];
  },
};

export default nextConfig;
