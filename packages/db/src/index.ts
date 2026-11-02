// Database access shared by the server (and later the Telegram bot / workers).
export { createDatabase, type Database } from "./client.js";
export { runMigrations } from "./migrate.js";
export * as schema from "./schema.js";
