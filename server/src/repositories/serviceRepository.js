import { getPool } from "../db/pool.js";

export async function listServices() {
  const pool = getPool();
  if (!pool) return [];
  const [rows] = await pool.query(
    "SELECT * FROM `Services` WHERE `deletedAt` IS NULL ORDER BY `name` ASC"
  );
  return rows;
}

export async function findServiceById(id) {
  const pool = getPool();
  if (!pool) return null;
  const [rows] = await pool.query(
    "SELECT * FROM `Services` WHERE `id` = ? AND `deletedAt` IS NULL LIMIT 1",
    [id]
  );
  return rows[0] ?? null;
}

export async function insertService(row) {
  const pool = getPool();
  if (!pool) throw new Error("Database not configured");
  const [result] = await pool.query(
    "INSERT INTO `Services` (`name`, `description`, `duration`) VALUES (?, ?, ?)",
    [row.name, row.description ?? null, row.duration]
  );
  return result.insertId;
}

export async function updateService(id, patch) {
  const pool = getPool();
  if (!pool) throw new Error("Database not configured");
  const allowed = ["name", "description", "duration"];
  const keys = allowed.filter((k) => patch[k] !== undefined);
  if (keys.length === 0) return;
  const set = keys.map((k) => `\`${k}\` = ?`).join(", ");
  const values = keys.map((k) => patch[k]);
  values.push(id);
  await pool.query(`UPDATE \`Services\` SET ${set} WHERE \`id\` = ? AND \`deletedAt\` IS NULL`, values);
}

export async function softDeleteService(id) {
  const pool = getPool();
  if (!pool) throw new Error("Database not configured");
  await pool.query(
    "UPDATE `Services` SET `deletedAt` = CURRENT_TIMESTAMP(6) WHERE `id` = ? AND `deletedAt` IS NULL",
    [id]
  );
}
