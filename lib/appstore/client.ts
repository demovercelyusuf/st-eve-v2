import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { pgPoolConfig } from "../db/config";
import * as schema from "./schema";

// A Drizzle client over the app-store: the copilot's own derived state. Like the warehouse pool we
// keep it small and quick to release so an idle Fluid instance holds no connections.

let db: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function appStore() {
  if (!db) {
    const connectionString = process.env.APPSTORE_DATABASE_URL;
    if (!connectionString) {
      throw new Error("APPSTORE_DATABASE_URL is not set");
    }
    db = drizzle(new Pool(pgPoolConfig(connectionString)), { schema });
  }
  return db;
}

export { schema };
