import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

let client: ReturnType<typeof postgres> | null = null;
let database: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export function getDb() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return null;
  }

  if (!client) {
    const configuredPoolSize = Number(process.env.DATABASE_POOL_MAX);
    const maxConnections = Number.isFinite(configuredPoolSize)
      ? Math.min(10, Math.max(1, configuredPoolSize))
      : process.env.VERCEL
        ? 1
        : 5;

    client = postgres(databaseUrl, {
      prepare: false,
      max: maxConnections,
      idle_timeout: 20,
      connect_timeout: 10
    });
  }

  if (!database) {
    database = drizzle(client, { schema });
  }

  return database;
}

export type Database = NonNullable<ReturnType<typeof getDb>>;
