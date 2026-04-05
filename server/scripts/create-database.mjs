/**
 * Connects to MySQL without selecting a database, then runs
 * CREATE DATABASE IF NOT EXISTS for the name in DATABASE_URL's path.
 * Usage: from `server/`, with `.env` or env vars set — npm run db:create
 */
import "dotenv/config";
import mysql from "mysql2/promise";
import { config } from "../src/config.js";

function parseTargetDb(databaseUrl) {
  const u = new URL(databaseUrl);
  const raw = u.pathname.replace(/^\//, "").split("/")[0]?.split("?")[0] ?? "";
  const name = raw || "booking_system";
  if (!/^[a-zA-Z0-9_]+$/.test(name)) {
    throw new Error(`Unsafe or invalid database name in DATABASE_URL: "${name}"`);
  }
  return {
    dbName: name,
    host: u.hostname,
    port: Number(u.port) || 3306,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
  };
}

async function main() {
  if (!config.databaseUrl?.trim()) {
    console.error("DATABASE_URL is not set. Copy server/.env.example to server/.env and set it.");
    process.exit(1);
  }

  const { dbName, host, port, user, password } = parseTargetDb(config.databaseUrl);

  console.log(`Connecting to ${user}@${host}:${port} (no schema)…`);

  const conn = await mysql.createConnection({
    host,
    port,
    user,
    password,
    multipleStatements: false,
  });

  await conn.query(
    `CREATE DATABASE IF NOT EXISTS \`${dbName}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await conn.end();

  console.log(`Database "${dbName}" is ready (created or already existed).`);
  console.log("Next: apply schema — e.g. import booking_system.sql in MySQL Workbench, or run your migration tool.");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
