// Runs pending migrations: `pnpm db:migrate` locally, or the `migrate` service in Docker.
import { runMigrations } from "./migrate.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

try {
  const applied = await runMigrations(databaseUrl);
  console.log(applied ? "Migrations applied" : "No migrations yet, nothing to do");
} catch (error) {
  console.error("Migration failed:", error);
  process.exit(1);
}
