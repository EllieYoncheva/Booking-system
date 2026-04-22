import { getPool } from "../db/pool.js";
import * as classRepository from "./classRepository.js";
import { isDuplicateKeyError } from "../utils/mysqlErrors.js";

const listSelect = `
  SELECT w.id,
    w.classId,
    c.name AS className,
    c.startsAt AS classStartsAt,
    c.endsAt AS classEndsAt,
    st.name AS studioName,
    s.name AS serviceName
  FROM \`Waitlist\` w
  INNER JOIN \`Classes\` c ON c.id = w.classId
  INNER JOIN \`Studios\` st ON st.id = c.studioId AND st.deletedAt IS NULL
  INNER JOIN \`Services\` s ON s.id = c.serviceId AND s.deletedAt IS NULL
`;

/**
 * @param {import("mysql2/promise").PoolConnection} conn
 * @param {number} userId
 * @param {number} classId
 */
export async function findWaitlistEntry(conn, userId, classId) {
  const [rows] = await conn.query(
    "SELECT * FROM `Waitlist` WHERE `userId` = ? AND `classId` = ? LIMIT 1",
    [userId, classId]
  );
  return rows[0] ?? null;
}

/**
 * @param {import("mysql2/promise").PoolConnection} conn
 * @param {number} userId
 * @param {number} classId
 */
export async function insertWaitlist(conn, userId, classId) {
  const [result] = await conn.query(
    "INSERT INTO `Waitlist` (`userId`, `classId`) VALUES (?, ?)",
    [userId, classId]
  );
  return result.insertId;
}

/**
 * @param {import("mysql2/promise").PoolConnection} conn
 * @param {number} userId
 * @param {number} classId
 */
export async function deleteWaitlistEntry(conn, userId, classId) {
  const [result] = await conn.query("DELETE FROM `Waitlist` WHERE `userId` = ? AND `classId` = ?", [
    userId,
    classId,
  ]);
  return result.affectedRows > 0;
}

/**
 * Join waitlist only when class is full, future, not cancelled, and user has no active booking.
 * @returns {Promise<{ ok: true, waitlistId: number } | { ok: false, code: string }>}
 */
export async function tryJoinWaitlist(userId, classId) {
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
      await conn.rollback();
      return { ok: false, code: "CLASS_HAS_SPOTS" };
    }
    const [activeRows] = await conn.query(
      "SELECT `id` FROM `Reservations` WHERE `userId` = ? AND `classId` = ? AND `status` IN ('pending', 'confirmed') LIMIT 1",
      [userId, classId]
    );
    if (activeRows.length > 0) {
      await conn.rollback();
      return { ok: false, code: "ALREADY_BOOKED" };
    }
    const existing = await findWaitlistEntry(conn, userId, classId);
    if (existing) {
      await conn.rollback();
      return { ok: false, code: "ALREADY_ON_WAITLIST" };
    }
    let waitlistId;
    try {
      waitlistId = await insertWaitlist(conn, userId, classId);
    } catch (err) {
      await conn.rollback();
      if (isDuplicateKeyError(err)) {
        return { ok: false, code: "ALREADY_ON_WAITLIST" };
      }
      throw err;
    }
    await conn.commit();
    return { ok: true, waitlistId };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

/**
 * @param {number} userId
 * @param {number} classId
 * @returns {Promise<boolean>}
 */
export async function leaveWaitlist(userId, classId) {
  const pool = getPool();
  if (!pool) throw new Error("Database not configured");
  const [result] = await pool.query("DELETE FROM `Waitlist` WHERE `userId` = ? AND `classId` = ?", [
    userId,
    classId,
  ]);
  return result.affectedRows > 0;
}

/** @param {number} userId */
export async function listWaitlistByUserId(userId) {
  const pool = getPool();
  if (!pool) return [];
  const [rows] = await pool.query(
    `${listSelect}
     WHERE w.\`userId\` = ? AND c.\`startsAt\` >= NOW(6) AND c.\`cancellationReason\` IS NULL
     ORDER BY c.startsAt ASC`,
    [userId]
  );
  return rows;
}
