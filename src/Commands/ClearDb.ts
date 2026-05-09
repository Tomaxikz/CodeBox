import { createInterface } from "node:readline/promises";

import { stdin as input, stdout as output } from "node:process";
import { db } from "../Services/Database/Database";
import { logger } from "../Services/Logger/LoggerService";

async function main() {
  const rl = createInterface({ input, output });

  const confirmation = await rl.question(
    'You are about to clear the whole PostgreSQL public schema. Type "RESET" to continue: ',
  );

  rl.close();

  if (confirmation !== "RESET") {
    logger.warn("Database reset cancelled");
    process.exit(1);
  }

  await db`DROP SCHEMA IF EXISTS public CASCADE`;
  await db`CREATE SCHEMA public`;
  await db`GRANT ALL ON SCHEMA public TO postgres`;
  await db`GRANT ALL ON SCHEMA public TO public`;

  logger.warn("Database public schema cleared");
  process.exit(0);
}

await main();
