import { fileURLToPathBuffer } from "node:url";
import { db } from "./Database";
import { logger } from "../Logger/LoggerService";


const migrationsPath = `${process.cwd()}/Database/Migrations`;

type MigrationRow = {
  name: string;
};

async function ensureMigrationsTable() {
  await db`
    CREATE TABLE IF NOT EXISTS migrations (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      ran_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

async function getAppliedMigrations() {
  const rows = await db<MigrationRow[]>`
    SELECT name FROM migrations
    ORDER BY name ASC
  `;

  return new Set(rows.map((row) => row.name));
}

export async function getMigrationFolder() {
    const glob = new Bun.Glob("*");
    const folders: string[] = [];

    for await (const name of glob.scan({
        cwd: migrationsPath,
        onlyFiles: false,
    })) {
        const upFile = Bun.file(`${migrationsPath}/${name}/up.sql`);
        const downFile = Bun.file(`${migrationsPath}/${name}/down.sql`);
        
        if(await upFile.exists() && await downFile.exists()){
            folders.push(name)
        }
    }
    folders.sort();
    return folders;
}

export async function migrateUp() {
    await ensureMigrationsTable();

    const applied = await getAppliedMigrations();
    const folders = await getMigrationFolder();

    for(const folderName of folders) {
        if(applied.has(folderName)){
            continue;
        }

        const upFilePath = `${migrationsPath}/${folderName}/up.sql`;
        logger.info(`Running migration ${folderName}`);

        await db.begin(async (tx) => {
            await tx.file(upFilePath);

            await tx`
                INSERT INTO migrations (name)
                VALUES (${folderName})
            `;
        });
        logger.info(`Migration completed ${folderName}`);
    }
}

export async function migrateDown() {
  await ensureMigrationsTable();

  const rows = await db<MigrationRow[]>`
    SELECT name FROM migrations
    ORDER BY name DESC
    LIMIT 1
  `;

  const latestMigration = rows[0];

  if (!latestMigration) {
    logger.info("No migrations to roll back");
    return;
  }

  const downFilePath = `${migrationsPath}/${latestMigration.name}/down.sql`;
  const downFile = Bun.file(downFilePath);

  if (!(await downFile.exists())) {
    throw new Error(`Missing down.sql for migration ${latestMigration.name}`);
  }

  logger.warn(`Rolling back migration ${latestMigration.name}`);

  await db.begin(async (tx) => {
    await tx.file(downFilePath);

    await tx`
      DELETE FROM migrations
      WHERE name = ${latestMigration.name}
    `;
  });

  logger.info(`Rollback completed ${latestMigration.name}`);
}

export const MigrationService = {
  up: migrateUp,
  down: migrateDown,
};