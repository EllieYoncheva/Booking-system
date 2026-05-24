import { getPool } from "../db/pool.js";
import * as classRepository from "./classRepository.js";
import * as waitlistRepository from "./waitlistRepository.js";
import { getNewReservationStatus } from "../services/appSettingsService.js";
import { canClientBookBeforeClass } from "../utils/bookingPolicy.js";
import { isDuplicateKeyError } from "../utils/mysqlErrors.js";

const listSelect = `
  SELECT r.*,
    c.name AS className,
    c.startsAt AS classStartsAt,
    DATE_ADD(c.startsAt, INTERVAL s.duration MINUTE) AS classEndsAt,
    c.studioId AS studioId,
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

const emailContextSelect = `
  SELECT r.*,
    c.name AS className,
    c.startsAt AS classStartsAt,
    DATE_ADD(c.startsAt, INTERVAL s.duration MINUTE) AS classEndsAt,
    c.studioId AS studioId,
    st.name AS studioName,
    s.name AS serviceName,
    s.duration AS serviceDuration,
    u.email AS clientEmail,
    u.firstName AS clientFirstName,
    u.lastName AS clientLastName
  FROM \`Reservations\` r
  INNER JOIN \`Classes\` c ON c.id = r.classId
  INNER JOIN \`Studios\` st ON st.id = c.studioId AND st.deletedAt IS NULL
  INNER JOIN \`Services\` s ON s.id = c.serviceId AND s.deletedAt IS NULL
  INNER JOIN \`Users\` u ON u.id = r.userId AND u.deletedAt IS NULL
`;

export async function findReservationEmailContext(id) {
  const pool = getPool();
  if (!pool) return null;
  const [rows] = await pool.query(`${emailContextSelect} WHERE r.\`id\` = ? LIMIT 1`, [id]);
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
 * Caller must hold `Classes` row lock for `classId` in the same transaction.
 * @param {import("mysql2/promise").PoolConnection} conn
 * @param {number} classId
 * @param {'pending'|'confirmed'} initialStatus
 * @returns {Promise<Array<{ reservationId: number, userId: number, classId: number, status: 'pending'|'confirmed' }>>}
 */
export async function promoteFromWaitlistLocked(conn, classId, initialStatus) {
  const promoted = [];
  const cls = await classRepository.lockClassById(conn, classId);
  if (!cls) return promoted;
  if (cls.cancellationReason != null && String(cls.cancellationReason).trim() !== "") {
    return promoted;
  }
  if (new Date(cls.startsAt) <= new Date()) {
    return promoted;
  }

  const cap = Number(cls.capacity);
  if (!Number.isFinite(cap) || cap < 1) {
    return promoted;
  }

  for (;;) {
    const taken = await classRepository.countReservationsForClass(conn, classId);
    if (taken >= cap) break;
    const next = await waitlistRepository.pickNextWaitingForUpdate(conn, classId);
    if (!next) break;
    try {
      const reservationId = await insertReservation(conn, Number(next.userId), classId, initialStatus);
      await waitlistRepository.deleteWaitlistRowById(conn, Number(next.id));
      promoted.push({
        reservationId: Number(reservationId),
        userId: Number(next.userId),
        classId,
        status: initialStatus,
      });
    } catch (err) {
      if (err && err.code === "ER_DUP_ENTRY") {
        await waitlistRepository.deleteWaitlistRowById(conn, Number(next.id));
        continue;
      }
      throw err;
    }
  }
  return promoted;
}

/**
 * Reserve when a spot is free. Status is `pending` unless auto-confirm is on.
 * @returns {Promise<{ ok: true, reservationId: number, status: 'pending'|'confirmed' } | { ok: false, code: string }>}
 */
export async function bookClassSpot(userId, classId) {
  const initialStatus = await getNewReservationStatus();
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
    const now = new Date();
    if (new Date(cls.startsAt) <= now) {
      await conn.rollback();
      return { ok: false, code: "CLASS_ALREADY_STARTED" };
    }
    if (!canClientBookBeforeClass(cls.startsAt)) {
      await conn.rollback();
      return { ok: false, code: "BOOKING_TOO_LATE" };
    }

    const taken = await classRepository.countReservationsForClass(conn, classId);
    const cap = Number(cls.capacity);
    if (!Number.isFinite(cap) || taken >= cap) {
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
    return { ok: true, reservationId, status: initialStatus };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

/** @deprecated Use bookClassSpot */
export const bookConfirmedOnly = bookClassSpot;

/**
 * Available spot → book with configured status. Full class → waitlist (FIFO). Atomic under class lock.
 * @returns {Promise<
 *   | { ok: true; kind: "booked"; reservationId: number }
 *   | { ok: true; kind: "waitlist"; waitlistId: number; position: number }
 *   | { ok: false; code: string }
 * >}
 */
export async function bookConfirmedOrJoinWaitlist(userId, classId) {
  const initialStatus = await getNewReservationStatus();
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
    const now = new Date();
    if (new Date(cls.startsAt) <= now) {
      await conn.rollback();
      return { ok: false, code: "CLASS_ALREADY_STARTED" };
    }

    const taken = await classRepository.countReservationsForClass(conn, classId);
    if (taken < cls.capacity) {
      if (!canClientBookBeforeClass(cls.startsAt)) {
        await conn.rollback();
        return { ok: false, code: "BOOKING_TOO_LATE" };
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
      return { ok: true, kind: "booked", reservationId, status: initialStatus };
    }

    const [activeRows] = await conn.query(
      `SELECT \`id\` FROM \`Reservations\` WHERE \`userId\` = ? AND \`classId\` = ? AND \`status\` IN ('pending', 'confirmed') LIMIT 1`,
      [userId, classId]
    );
    if (activeRows.length > 0) {
      await conn.rollback();
      return { ok: false, code: "ALREADY_BOOKED" };
    }

    const existingAny = await waitlistRepository.findAnyWaitlistEntryForUpdate(conn, userId, classId);
    if (existingAny) {
      if (existingAny.status === "waiting") {
        await conn.rollback();
        return { ok: false, code: "ALREADY_ON_WAITLIST" };
      }
      await conn.query(
        "UPDATE `Waitlist` SET `status` = 'waiting', `notifiedAt` = NULL, `createdAt` = CURRENT_TIMESTAMP(6) WHERE `id` = ?",
        [existingAny.id]
      );
      await conn.commit();
      const position = (await waitlistRepository.getWaitlistPosition(userId, classId)) ?? 1;
      return { ok: true, kind: "waitlist", waitlistId: Number(existingAny.id), position };
    }

    let waitlistId;
    try {
      waitlistId = await waitlistRepository.insertWaitlist(conn, userId, classId);
    } catch (err) {
      await conn.rollback();
      if (isDuplicateKeyError(err)) {
        return { ok: false, code: "ALREADY_ON_WAITLIST" };
      }
      throw err;
    }
    await conn.commit();
    const position = (await waitlistRepository.getWaitlistPosition(userId, classId)) ?? 1;
    return { ok: true, kind: "waitlist", waitlistId, position };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

/**
 * @returns {Promise<
 *   | { ok: true; promoted: Array<{ reservationId: number; userId: number; classId: number }>; cancelledUserId: number }
 *   | { ok: false; code: "NOT_FOUND"|"NOT_ACTIVE"|"FORBIDDEN" }
 * >}
 */
export async function cancelActiveReservationWithPromotion(reservationId, opts = {}) {
  const userId = opts.userId != null ? Number(opts.userId) : null;
  const asAdmin = Boolean(opts.asAdmin);
  const adminReason =
    asAdmin && opts.adminReason != null && String(opts.adminReason).trim()
      ? String(opts.adminReason).trim().slice(0, 500)
      : null;

  const promotionStatus = await getNewReservationStatus();

  const pool = getPool();
  if (!pool) throw new Error("Database not configured");
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [pre] = await conn.query("SELECT * FROM `Reservations` WHERE `id` = ? FOR UPDATE", [reservationId]);
    const r = pre[0];
    if (!r) {
      await conn.rollback();
      return { ok: false, code: "NOT_FOUND" };
    }
    if (!["pending", "confirmed"].includes(r.status)) {
      await conn.rollback();
      return { ok: false, code: "NOT_ACTIVE" };
    }
    if (!asAdmin && userId != null && Number(r.userId) !== userId) {
      await conn.rollback();
      return { ok: false, code: "FORBIDDEN" };
    }

    await classRepository.lockClassById(conn, r.classId);

    const newStatus = asAdmin ? "cancelled_by_admin" : "cancelled_by_user";
    const [upd] = await conn.query(
      `UPDATE \`Reservations\`
       SET \`status\` = ?,
           \`cancelledAt\` = CURRENT_TIMESTAMP(6),
           \`adminCancelReason\` = ?
       WHERE \`id\` = ? AND \`status\` IN ('pending', 'confirmed')`,
      [newStatus, asAdmin ? adminReason : null, reservationId]
    );
    if (!upd.affectedRows) {
      await conn.rollback();
      return { ok: false, code: "NOT_ACTIVE" };
    }

    const promoted = await promoteFromWaitlistLocked(conn, r.classId, promotionStatus);
    await conn.commit();
    return { ok: true, promoted, cancelledUserId: Number(r.userId) };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

/**
 * Transactional book: lock class, check capacity and cancellation, insert reservation.
 * @param {{ initialStatus?: 'pending'|'confirmed' }} [opts]
 * @returns {Promise<{ ok: true, reservationId: number } | { ok: false, code: string }>}
 */
export async function tryBookClass(userId, classId, opts = {}) {
  void opts;
  const r = await bookConfirmedOrJoinWaitlist(userId, classId);
  if (!r.ok) {
    return { ok: false, code: r.code };
  }
  if (r.kind === "booked") {
    return { ok: true, reservationId: r.reservationId };
  }
  return { ok: false, code: "CLASS_FULL" };
}

export async function cancelReservationByUser(reservationId, userId) {
  const r = await cancelActiveReservationWithPromotion(reservationId, { userId, asAdmin: false });
  return r.ok;
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
