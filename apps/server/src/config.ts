import { z } from "zod";

// All environment-based settings live here, so the rest of the code never reads process.env directly.
// The server refuses to start if a required variable is missing or invalid.
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  DATABASE_URL: z.url(),

  // Secret used to sign download links. Generate one with: openssl rand -hex 32
  DOWNLOAD_TOKEN_SECRET: z.string().min(32, "must be at least 32 characters"),
  // Largest file the server will download, in megabytes.
  MAX_DOWNLOAD_MB: z.coerce.number().positive().default(200),
  // Optional outbound proxy for all requests to external sites.
  HTTPS_PROXY: z.url().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:\n" + z.prettifyError(parsed.error));
  console.error("Hint: copy .env.example to .env in the repo root.");
  process.exit(1);
}

const env = parsed.data;

export const config = {
  host: env.HOST,
  port: env.PORT,
  logLevel: env.LOG_LEVEL,
  databaseUrl: env.DATABASE_URL,
  isProduction: env.NODE_ENV === "production",
  downloadTokenSecret: env.DOWNLOAD_TOKEN_SECRET,
  maxDownloadBytes: Math.round(env.MAX_DOWNLOAD_MB * 1024 * 1024),
  outboundProxyUrl: env.HTTPS_PROXY,
};
