/**
 * Idempotent DDL for admin clients / reservations / booking settings.
 * Run after an older DB that predates migration 20250406120000.
 * Usage: node scripts/ensure-admin-schema.mjs  (from server/, with DATABASE_URL in .env)
 */
import "dotenv/config";
import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

/**
 * @param {import("mysql2/promise").Connection} conn
 * @param {string} table
 * @param {string} column
 */
async function columnExists(conn, table, column) {
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS c FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND LOWER(TABLE_NAME) = LOWER(?)
       AND COLUMN_NAME = ?`,
    [table, column]
  );
  return Number(rows[0]?.c ?? 0) > 0;
}

/**
 * @param {import("mysql2/promise").Connection} conn
 * @param {string} table
 */
async function tableExists(conn, table) {
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS c FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = LOWER(?)`,
    [table]
  );
  return Number(rows[0]?.c ?? 0) > 0;
}

async function main() {
  const conn = await mysql.createConnection(url);
  try {
    if (!(await columnExists(conn, "Users", "notes"))) {
      await conn.query("ALTER TABLE `Users` ADD COLUMN `notes` TEXT NULL");
      console.log("Added Users.notes");
    }
    if (!(await columnExists(conn, "Users", "internalNotes"))) {
      await conn.query("ALTER TABLE `Users` ADD COLUMN `internalNotes` TEXT NULL");
      console.log("Added Users.internalNotes");
    }
    if (!(await columnExists(conn, "Reservations", "adminCancelReason"))) {
      await conn.query(
        "ALTER TABLE `Reservations` ADD COLUMN `adminCancelReason` VARCHAR(500) NULL"
      );
      console.log("Added Reservations.adminCancelReason");
    }
    if (!(await tableExists(conn, "AppSettings"))) {
      await conn.query(`
        CREATE TABLE \`AppSettings\` (
          \`key\` VARCHAR(64) NOT NULL,
          \`value\` TEXT NOT NULL,
          PRIMARY KEY (\`key\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log("Created AppSettings");
    }
    await conn.query(
      `INSERT INTO \`AppSettings\` (\`key\`, \`value\`) VALUES ('booking.autoConfirm', 'false')
       ON DUPLICATE KEY UPDATE \`key\` = \`key\``
    );
    console.log("Ensured booking.autoConfirm row");
    console.log("Done.");
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
