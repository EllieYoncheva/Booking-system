import { getPool } from "../db/pool.js";
import * as classRepository from "./classRepository.js";

const listSelect = `
  SELECT r.*,
    c.name AS className,
    c.startsAt AS classStartsAt,
    DATE_ADD(c.startsAt, INTERVAL s.duration MINUTE) AS classEndsAt,
    st.name AS studioName,
    s.name AS serviceName,
    s.duration AS serviceDuration
  FROM \`Reservations\` r
  INNER JOIN \`Classes\` c ON c.id = r.classId
  INNER JOIN \`Studios\` st ON st.id = c.studioId AND st.deletedAt IS NULL
  INNER JOIN \`Services\` s ON s.id = c.serviceId AND s.deletedAt IS NULL
`;

const adminListSelect = `
  SELECT r.*,
    c.name AS className,
    c.startsAt AS classStartsAt,
    DATE_ADD(c.startsAt, INTERVAL s.duration MINUTE) AS classEndsAt,
    st.name AS studioName,
    s.name AS serviceName,
    s.duration AS serviceDuration,
    u.firstName AS clientFirstName,
    u.lastName AS clientLastName,
    u.email AS clientEmail,
    u.phone AS clientPhone
  FROM \`Reservations\` r
  INNER JOIN \`Classes\` c ON c.id = r.classId
  INNER JOIN \`Studios\` st ON st.id = c.studioId AND st.deletedAt IS NULL
  INNER JOIN \`Services\` s ON s.id = c.serviceId AND s.deletedAt IS NULL
  INNER JOIN \`Users\` u ON u.id = r.userId AND u.deletedAt IS NULL
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
 * @param {number} userId
 * @param {number} classId
 * @param {'pending'|'confirmed'} [status]
 */
export async function insertReservation(conn, userId, classId, status = "pending") {
  const [result] = await conn.query(
    "INSERT INTO `Reservations` (`userId`, `classId`, `status`) VALUES (?, ?, ?)",
    [userId, classId, status]
  );
  return result.insertId;
}

/**
 * Pool insert (no transaction). Prefer tryBookClass for client bookings.
 * @param {{ userId: number, classId: number, status?: 'pending'|'confirmed' }} row
 */
export async function insertReservationWithPool(row) {
  const pool = getPool();
  if (!pool) throw new Error("Database not configured");
  const status = row.status ?? "pending";
  const [result] = await pool.query(
    "INSERT INTO `Reservations` (`userId`, `classId`, `status`) VALUES (?, ?, ?)",
    [row.userId, row.classId, status]
  );
  return findReservationById(result.insertId);
}

/**
 * @param {{ userId?: number, classId?: number, status?: string, limit?: number, offset?: number }} filters
 */
export async function listReservationsAdmin(filters = {}) {
  const pool = getPool();
  if (!pool) return [];
  const limit = Math.min(Math.max(Number(filters.limit) || 50, 1), 100);
  const offset = Math.max(Number(filters.offset) || 0, 0);
  const conditions = [];
  const params = [];
  if (filters.userId != null) {
    conditions.push("r.`userId` = ?");
    params.push(filters.userId);
  }
  if (filters.classId != null) {
    conditions.push("r.`classId` = ?");
    params.push(filters.classId);
  }
  if (filters.status != null && String(filters.status).trim()) {
    conditions.push("r.`status` = ?");
    params.push(filters.status);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  params.push(limit, offset);
  const [rows] = await pool.query(
    `${adminListSelect} ${where} ORDER BY r.createdAt DESC LIMIT ? OFFSET ?`,
    params
  );
  return rows;
}

/**
 * @param {number} userId
 * @param {{ classId?: number, status?: string, limit?: number, offset?: number }} [filters]
 */
export async function listReservationsForUser(userId, filters = {}) {
  const pool = getPool();
  if (!pool) return [];
  const limit = Math.min(Math.max(Number(filters.limit) || 50, 1), 100);
  const offset = Math.max(Number(filters.offset) || 0, 0);
  const conditions = ["r.`userId` = ?"];
  const params = [userId];
  if (filters.classId != null) {
    conditions.push("r.`classId` = ?");
    params.push(filters.classId);
  }
  if (filters.status != null && String(filters.status).trim()) {
    conditions.push("r.`status` = ?");
    params.push(filters.status);
  }
  const where = `WHERE ${conditions.join(" AND ")}`;
  params.push(limit, offset);
  const [rows] = await pool.query(
    `${listSelect} ${where} ORDER BY c.startsAt DESC LIMIT ? OFFSET ?`,
    params
  );
  return rows;
}

/**
 * Transactional book: lock class, check capacity and cancellation, insert reservation.
 * @param {{ initialStatus?: 'pending'|'confirmed' }} [opts]
 * @returns {Promise<{ ok: true, reservationId: number } | { ok: false, code: string }>}
 */
export async function tryBookClass(userId, classId, opts = {}) {
  const initialStatus = opts.initialStatus === "confirmed" ? "confirmed" : "pending";
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
      reservationId = await insertReservation(conn, userId, classId, initialStatus);
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
     SET \`status\` = 'cancelled_by_user', \`cancelledAt\` = CURRENT_TIMESTAMP(6), \`adminCancelReason\` = NULL
     WHERE \`id\` = ? AND \`userId\` = ? AND \`status\` IN ('pending', 'confirmed')`,
    [reservationId, userId]
  );
  return result.affectedRows > 0;
}

/**
 * @param {number} id
 * @param {string} status
 * @param {Date|null} [cancelledAt] pass undefined to leave unchanged; null to clear (rare)
 * @param {{ adminCancelReason?: string|null }} [extra]
 */
export async function updateReservationStatus(id, status, cancelledAt, extra = {}) {
  const pool = getPool();
  if (!pool) throw new Error("Database not configured");
  const sets = ["`status` = ?"];
  const vals = [status];
  if (cancelledAt !== undefined) {
    sets.push("`cancelledAt` = ?");
    vals.push(cancelledAt);
  }
  if (Object.prototype.hasOwnProperty.call(extra, "adminCancelReason")) {
    sets.push("`adminCancelReason` = ?");
    vals.push(extra.adminCancelReason);
  }
  vals.push(id);
  await pool.query(`UPDATE \`Reservations\` SET ${sets.join(", ")} WHERE \`id\` = ?`, vals);
  return findReservationById(id);
}
