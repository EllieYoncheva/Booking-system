import { getPool } from "../db/pool.js";

export async function listStudios() {
  const pool = getPool();
  if (!pool) return [];
  const [rows] = await pool.query(
    "SELECT * FROM `Studios` WHERE `deletedAt` IS NULL ORDER BY `name` ASC"
  );
  return rows;
}

export async function findStudioById(id) {
  const pool = getPool();
  if (!pool) return null;
  const [rows] = await pool.query(
    "SELECT * FROM `Studios` WHERE `id` = ? AND `deletedAt` IS NULL LIMIT 1",
    [id]
  );
  return rows[0] ?? null;
}

export async function insertStudio(row) {
  const pool = getPool();
  if (!pool) throw new Error("Database not configured");
  const [result] = await pool.query(
    "INSERT INTO `Studios` (`name`, `country`, `city`, `address`, `phone`, `email`) VALUES (?, ?, ?, ?, ?, ?)",
    [
      row.name,
      row.country ?? null,
      row.city ?? null,
      row.address ?? null,
      row.phone ?? null,
      row.email ?? null,
    ]
  );
  return result.insertId;
}

export async function updateStudio(id, patch) {
  const pool = getPool();
  if (!pool) throw new Error("Database not configured");
  const allowed = ["name", "country", "city", "address", "phone", "email"];
  const keys = allowed.filter((k) => patch[k] !== undefined);
  if (keys.length === 0) return;
  const set = keys.map((k) => `\`${k}\` = ?`).join(", ");
  const values = keys.map((k) => patch[k]);
  values.push(id);
  await pool.query(`UPDATE \`Studios\` SET ${set} WHERE \`id\` = ? AND \`deletedAt\` IS NULL`, values);
}

export async function softDeleteStudio(id) {
  const pool = getPool();
  if (!pool) throw new Error("Database not configured");
  await pool.query(
    "UPDATE `Studios` SET `deletedAt` = CURRENT_TIMESTAMP(6) WHERE `id` = ? AND `deletedAt` IS NULL",
    [id]
  );
}
