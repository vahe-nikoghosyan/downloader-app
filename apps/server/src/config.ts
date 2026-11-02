import { z } from "zod";

// All environment-based settings live here, so the rest of the code never reads process.env directly.
// The server refuses to start if a required variable is missing or invalid.
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  DATABASE_URL: z.url(),
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
};
