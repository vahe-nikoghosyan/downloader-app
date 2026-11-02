import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

export interface CreateDatabaseOptions {
  /** Max open connections in the pool. */
  maxConnections?: number;
}

// Creates a connection pool and a typed Drizzle client on top of it.
// Connections are opened lazily, on the first query.
export function createDatabase(url: string, options: CreateDatabaseOptions = {}) {
  const client = postgres(url, {
    max: options.maxConnections ?? 10,
    onnotice: () => {}, // hide Postgres NOTICE messages (e.g. "table already exists, skipping")
  });

  const db = drizzle(client, { schema, casing: "snake_case" });

  return {
    db,
    /** Close every connection. Call this on shutdown. */
    close: () => client.end({ timeout: 5 }),
  };
}

export type Database = ReturnType<typeof createDatabase>["db"];
