import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

/**
 * Database client.
 *
 * For local development this defaults to a SQLite file (`local.db`) so the app
 * runs with zero external setup. To use a hosted Turso database, set the
 * environment variables `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`.
 */
const url = process.env.TURSO_DATABASE_URL ?? "file:local.db";
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient({ url, authToken });

export const db = drizzle(client, { schema });
export { schema };
