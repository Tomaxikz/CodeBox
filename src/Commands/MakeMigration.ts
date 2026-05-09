const migrationName = Bun.argv[2];

if (!migrationName) {
  console.error("Missing migration name");
  console.error("Usage: bun run migrate:make create_users");
  process.exit(1);
}

function getTimestamp() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");
  const second = String(now.getSeconds()).padStart(2, "0");

  return `${year}${month}${day}${hour}${minute}${second}`;
}

function normalizeMigrationName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replaceAll(" ", "_")
    .replace(/[^a-z0-9_]/g, "");
}

const safeName = normalizeMigrationName(migrationName);
const timestamp = getTimestamp();

const migrationFolder = `${process.cwd()}/Database/Migrations/${timestamp}_${safeName}`;

await Bun.write(`${migrationFolder}/up.sql`, "-- Write migration SQL here\n", {
  createPath: true,
});

await Bun.write(`${migrationFolder}/down.sql`, "-- Write rollback SQL here\n", {
  createPath: true,
});

console.log(`Created migration: ${timestamp}_${safeName}`);
