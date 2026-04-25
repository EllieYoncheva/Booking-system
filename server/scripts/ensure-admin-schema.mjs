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

/**
 * @param {import("mysql2/promise").Connection} conn
 * @param {string} table
 * @param {string} indexName
 */
async function indexExists(conn, table, indexName) {
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS c FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND LOWER(TABLE_NAME) = LOWER(?)
       AND INDEX_NAME = ?`,
    [table, indexName]
  );
  return Number(rows[0]?.c ?? 0) > 0;
}

/**
 * @param {import("mysql2/promise").Connection} conn
 * @param {string} table
 * @param {string} constraintName
 */
async function constraintExists(conn, table, constraintName) {
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS c FROM information_schema.TABLE_CONSTRAINTS
     WHERE TABLE_SCHEMA = DATABASE()
       AND LOWER(TABLE_NAME) = LOWER(?)
       AND CONSTRAINT_NAME = ?`,
    [table, constraintName]
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

    if (!(await columnExists(conn, "Services", "duration"))) {
      await conn.query("ALTER TABLE `Services` ADD COLUMN `duration` INT NOT NULL DEFAULT 60");
      console.log("Added Services.duration");
    }
    if (!(await constraintExists(conn, "Services", "chk_Services_duration"))) {
      await conn.query("ALTER TABLE `Services` ADD CONSTRAINT `chk_Services_duration` CHECK (`duration` > 0)");
      console.log("Added chk_Services_duration");
    }

    if (!(await columnExists(conn, "Classes", "scheduleId"))) {
      await conn.query("ALTER TABLE `Classes` ADD COLUMN `scheduleId` INT NULL");
      console.log("Added Classes.scheduleId");
    }
    if (!(await indexExists(conn, "Classes", "fk_Classes_Schedules_idx"))) {
      await conn.query("ALTER TABLE `Classes` ADD INDEX `fk_Classes_Schedules_idx` (`scheduleId`)");
      console.log("Added fk_Classes_Schedules_idx");
    }
    if (!(await indexExists(conn, "Classes", "uq_Classes_schedule_start"))) {
      await conn.query("ALTER TABLE `Classes` ADD UNIQUE INDEX `uq_Classes_schedule_start` (`scheduleId`, `startsAt`)");
      console.log("Added uq_Classes_schedule_start");
    }

    if (!(await tableExists(conn, "Schedules"))) {
      await conn.query(`
        CREATE TABLE \`Schedules\` (
          \`id\` INT NOT NULL AUTO_INCREMENT,
          \`classId\` INT NOT NULL,
          \`recurrenceRule\` VARCHAR(255) NOT NULL,
          \`startDate\` DATE NOT NULL,
          \`endDate\` DATE NULL,
          \`daysOfWeek\` JSON NULL,
          \`startTime\` TIME NOT NULL,
          PRIMARY KEY (\`id\`),
          KEY \`fk_Schedules_Classes_idx\` (\`classId\`),
          CONSTRAINT \`fk_Schedules_Classes\`
            FOREIGN KEY (\`classId\`)
            REFERENCES \`Classes\` (\`id\`)
            ON DELETE CASCADE
            ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log("Created Schedules");
    }

    if (!(await constraintExists(conn, "Classes", "fk_Classes_Schedules"))) {
      await conn.query(`
        UPDATE \`Classes\` c
        LEFT JOIN \`Schedules\` sc ON sc.\`id\` = c.\`scheduleId\`
        SET c.\`scheduleId\` = NULL
        WHERE c.\`scheduleId\` IS NOT NULL AND sc.\`id\` IS NULL
      `);
      await conn.query(`
        ALTER TABLE \`Classes\`
        ADD CONSTRAINT \`fk_Classes_Schedules\`
        FOREIGN KEY (\`scheduleId\`)
        REFERENCES \`Schedules\` (\`id\`)
        ON DELETE SET NULL
        ON UPDATE CASCADE
      `);
      console.log("Added fk_Classes_Schedules");
    }
    console.log("Done.");
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
