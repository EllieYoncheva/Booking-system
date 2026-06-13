import { getPool } from "../db/pool.js";

export async function listInstructors() {
  const pool = getPool();
  if (!pool) return [];
  const [rows] = await pool.query(
    "SELECT * FROM `Instructors` WHERE `deletedAt` IS NULL ORDER BY `lastName` ASC, `firstName` ASC"
  );
  return rows;
}

export async function findInstructorById(id) {
  const pool = getPool();
  if (!pool) return null;
  const [rows] = await pool.query(
    "SELECT * FROM `Instructors` WHERE `id` = ? AND `deletedAt` IS NULL LIMIT 1",
    [id]
  );
  return rows[0] ?? null;
}

export async function insertInstructor(row) {
  const pool = getPool();
  if (!pool) throw new Error("Database not configured");
  const [result] = await pool.query(
    "INSERT INTO `Instructors` (`firstName`, `lastName`, `phone`, `email`) VALUES (?, ?, ?, ?)",
    [row.firstName, row.lastName, row.phone ?? null, row.email ?? null]
  );
  return result.insertId;
}

export async function updateInstructor(id, patch) {
  const pool = getPool();
  if (!pool) throw new Error("Database not configured");
  const allowed = ["firstName", "lastName", "phone", "email"];
  const keys = allowed.filter((k) => patch[k] !== undefined);
  if (keys.length === 0) return;
  const set = keys.map((k) => `\`${k}\` = ?`).join(", ");
  const values = keys.map((k) => patch[k]);
  values.push(id);
  await pool.query(`UPDATE \`Instructors\` SET ${set} WHERE \`id\` = ? AND \`deletedAt\` IS NULL`, values);
}

export async function softDeleteInstructor(id) {
  const pool = getPool();
  if (!pool) throw new Error("Database not configured");
  await pool.query(
    "UPDATE `Instructors` SET `deletedAt` = CURRENT_TIMESTAMP(6) WHERE `id` = ? AND `deletedAt` IS NULL",
    [id]
  );
}
