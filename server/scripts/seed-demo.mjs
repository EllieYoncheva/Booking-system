/**
 * Inserts demo studio, service, instructor, and a few future classes.
 * Requires schema applied (booking_system.sql) and DATABASE_URL in .env.
 * Usage: npm run db:seed --prefix server
 */
import "dotenv/config";
import mysql from "mysql2/promise";
import { config } from "../src/config.js";

async function main() {
  if (!config.databaseUrl?.trim()) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const pool = mysql.createPool(config.databaseUrl);
  const conn = await pool.getConnection();
  try {
    const [st] = await conn.query(
      "INSERT INTO `Studios` (`name`, `city`, `country`) VALUES ('Демо студио', 'София', 'България')"
    );
    const studioId = st.insertId;

    const [se] = await conn.query(
      "INSERT INTO `Services` (`name`, `description`) VALUES ('Пилатес мат', 'Групов час на постелка')"
    );
    const serviceId = se.insertId;

    const [ins] = await conn.query(
      "INSERT INTO `Instructors` (`firstName`, `lastName`) VALUES ('Мария', 'Демова')"
    );
    const instructorId = ins.insertId;

    const now = new Date();
    const slots = [2, 3, 5].map((d) => {
      const start = new Date(now);
      start.setDate(start.getDate() + d);
      start.setHours(10, 0, 0, 0);
      const end = new Date(start);
      end.setHours(11, 0, 0, 0);
      return { start, end };
    });

    for (const { start, end } of slots) {
      await conn.query(
        `INSERT INTO \`Classes\` (\`name\`, \`startsAt\`, \`endsAt\`, \`capacity\`, \`serviceId\`, \`studioId\`, \`instructorId\`, \`price\`)
         VALUES (?, ?, ?, 8, ?, ?, ?, 25.00)`,
        ["Демо клас", start, end, serviceId, studioId, instructorId]
      );
    }

    console.log("Seed OK:", { studioId, serviceId, instructorId, classes: slots.length });
  } finally {
    conn.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
