import { getPool } from "../db/pool.js";

/**
 * @param {import("mysql2/promise").PoolConnection|import("mysql2/promise").Pool} executor
 * @param {{ userId: number, type: string, reservationId?: number|null, classId?: number|null }} row
 */
export async function insertNotification(executor, row) {
  await executor.query(
    "INSERT INTO `Notifications` (`userId`, `type`, `reservationId`, `classId`) VALUES (?, ?, ?, ?)",
    [row.userId, row.type, row.reservationId ?? null, row.classId ?? null]
  );
}

/**
 * @param {import("mysql2/promise").PoolConnection|import("mysql2/promise").Pool} executor
 * @param {{ userId: number, type: string, reservationId?: number|null, classId?: number|null }} row
 */
export async function insertNotificationSafe(executor, row) {
  try {
    await insertNotification(executor, row);
  } catch (e) {
    if (e && e.code === "ER_DUP_ENTRY") return;
    console.error("[notifications] insert failed", { row, code: e?.code, message: e?.message });
  }
}

/** @returns {Promise<number[]>} */
export async function listAdminUserIds() {
  const pool = getPool();
  if (!pool) return [];
  try {
    const [rows] = await pool.query(
      "SELECT `id` FROM `Users` WHERE `role` = 'admin' AND `deletedAt` IS NULL"
    );
    return rows.map((r) => Number(r.id));
  } catch (e) {
    console.error("[notifications] listAdminUserIds failed", e);
    return [];
  }
}
