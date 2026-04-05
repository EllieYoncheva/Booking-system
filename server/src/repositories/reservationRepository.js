import { getPool } from "../db/pool.js";
import * as classRepository from "./classRepository.js";

const listSelect = `
  SELECT r.*,
    c.name AS className,
    c.startsAt AS classStartsAt,
    c.endsAt AS classEndsAt,
    st.name AS studioName,
    s.name AS serviceName
  FROM \`Reservations\` r
  INNER JOIN \`Classes\` c ON c.id = r.classId
  INNER JOIN \`Studios\` st ON st.id = c.studioId AND st.deletedAt IS NULL
  INNER JOIN \`Services\` s ON s.id = c.serviceId AND s.deletedAt IS NULL
`;

export async function listReservationsByUserId(userId) {
  const pool = getPool();
  if (!pool) return [];
  const [rows] = await pool.query(
    `${listSelect} WHERE r.\`userId\` = ? ORDER BY c.startsAt DESC`,
    [userId]
  );
  return rows;
}

export async function findReservationById(id) {
  const pool = getPool();
  if (!pool) return null;
  const [rows] = await pool.query(`${listSelect} WHERE r.\`id\` = ? LIMIT 1`, [id]);
  return rows[0] ?? null;
}

/**
 * @param {import("mysql2/promise").PoolConnection} conn
 */
export async function insertReservation(conn, userId, classId) {
  const [result] = await conn.query(
    "INSERT INTO `Reservations` (`userId`, `classId`, `status`) VALUES (?, ?, 'pending')",
    [userId, classId]
  );
  return result.insertId;
}

/**
 * Transactional book: lock class, check capacity and cancellation, insert reservation.
 * @returns {Promise<{ ok: true, reservationId: number } | { ok: false, code: string }>}
 */
export async function tryBookClass(userId, classId) {
  const pool = getPool();
  if (!pool) throw new Error("Database not configured");
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const cls = await classRepository.lockClassById(conn, classId);
    if (!cls) {
      await conn.rollback();
      return { ok: false, code: "CLASS_NOT_FOUND" };
    }
    if (cls.cancellationReason != null && String(cls.cancellationReason).trim() !== "") {
      await conn.rollback();
      return { ok: false, code: "CLASS_CANCELLED" };
    }
    const taken = await classRepository.countReservationsForClass(conn, classId);
    if (taken >= cls.capacity) {
      await conn.rollback();
      return { ok: false, code: "CLASS_FULL" };
    }
    let reservationId;
    try {
      reservationId = await insertReservation(conn, userId, classId);
    } catch (err) {
      await conn.rollback();
      if (err && err.code === "ER_DUP_ENTRY") {
        return { ok: false, code: "ALREADY_BOOKED" };
      }
      throw err;
    }
    await conn.commit();
    return { ok: true, reservationId };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export async function cancelReservationByUser(reservationId, userId) {
  const pool = getPool();
  if (!pool) throw new Error("Database not configured");
  const [result] = await pool.query(
    `UPDATE \`Reservations\`
     SET \`status\` = 'cancelled_by_user', \`cancelledAt\` = CURRENT_TIMESTAMP(6)
     WHERE \`id\` = ? AND \`userId\` = ? AND \`status\` IN ('pending', 'confirmed')`,
    [reservationId, userId]
  );
  return result.affectedRows > 0;
}
