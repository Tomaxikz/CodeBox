import { SQL } from "bun";
import { logger } from "../Logger/LoggerService";

const databaseUrl = Bun.env.POSTGRES_URL ?? Bun.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("Missing POSTGRES_URL or DATABASE_URL");
}

export const db = new SQL(databaseUrl);

export async function rawQuery<T = unknown>(query: string, values?: unknown[]) {
  return db.unsafe<T>(query, values);
}

export async function testDatabaseConnection(): Promise<void> {
  const [result] = await db`
    SELECT 1 AS ok
  `;

  if (!result || result.ok !== 1) {
    throw new Error("Database test query failed");
  }

  logger.info("Database connection is live!");
}
