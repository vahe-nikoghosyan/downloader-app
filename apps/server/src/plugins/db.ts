import fp from "fastify-plugin";
import { createDatabase, type Database } from "@downloader/db";
import { config } from "../config.js";

// Makes the database available everywhere as `app.db` (and `request.server.db`).
declare module "fastify" {
  interface FastifyInstance {
    db: Database;
  }
}

// fastify-plugin makes the decorator visible to the whole app, not only inside this plugin.
export const dbPlugin = fp(async (app) => {
  const { db, close } = createDatabase(config.databaseUrl);

  app.decorate("db", db);

  // Close the connection pool when the server shuts down.
  app.addHook("onClose", async () => {
    await close();
  });
});
