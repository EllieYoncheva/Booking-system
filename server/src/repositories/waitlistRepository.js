import { getPool } from "../db/pool.js";
import * as classRepository from "./classRepository.js";
import { isDuplicateKeyError } from "../utils/mysqlErrors.js";

const listSelect = `
  SELECT w.id,
    w.classId,
    w.status,
    w.createdAt,
    w.notifiedAt,
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
export async function findWaitlistEntryWaiting(conn, userId, classId) {
  const [rows] = await conn.query(
    "SELECT * FROM `Waitlist` WHERE `userId` = ? AND `classId` = ? AND `status` = 'waiting' LIMIT 1",
    [userId, classId]
  );
  return rows[0] ?? null;
}

/**
 * @param {import("mysql2/promise").PoolConnection} conn
 * @param {number} userId
 * @param {number} classId
 */
export async function findAnyWaitlistEntryForUpdate(conn, userId, classId) {
  const [rows] = await conn.query(
    "SELECT * FROM `Waitlist` WHERE `userId` = ? AND `classId` = ? LIMIT 1 FOR UPDATE",
    [userId, classId]
  );
  return rows[0] ?? null;
}

/**
 * @param {import("mysql2/promise").PoolConnection} conn
 * @param {number} classId
 */
export async function countWaitingForClass(conn, classId) {
  const [rows] = await conn.query(
    "SELECT COUNT(*) AS cnt FROM `Waitlist` WHERE `classId` = ? AND `status` = 'waiting'",
    [classId]
  );
  return Number(rows[0]?.cnt ?? 0);
}

/**
 * @param {import("mysql2/promise").PoolConnection} conn
 * @param {number} userId
 * @param {number} classId
 */
export async function insertWaitlist(conn, userId, classId) {
  const [result] = await conn.query(
    "INSERT INTO `Waitlist` (`userId`, `classId`, `status`) VALUES (?, ?, 'waiting')",
    [userId, classId]
  );
  return result.insertId;
}

/**
 * Remove a waitlist row after promotion or on duplicate-booking cleanup (works without `status` column).
 * @param {import("mysql2/promise").PoolConnection} conn
 * @param {number} waitlistId
 */
export async function deleteWaitlistRowById(conn, waitlistId) {
  await conn.query("DELETE FROM `Waitlist` WHERE `id` = ?", [waitlistId]);
}

/**
 * @param {import("mysql2/promise").PoolConnection} conn
 * @param {number} waitlistId
 */
export async function markWaitlistPromoted(conn, waitlistId) {
  await conn.query("UPDATE `Waitlist` SET `status` = 'promoted' WHERE `id` = ? AND `status` = 'waiting'", [
    waitlistId,
  ]);
}

/**
 * @param {import("mysql2/promise").PoolConnection} conn
 * @param {number} waitlistId
 */
export async function markWaitlistRemovedById(conn, waitlistId) {
  await conn.query("UPDATE `Waitlist` SET `status` = 'removed' WHERE `id` = ?", [waitlistId]);
}

/**
 * @param {import("mysql2/promise").PoolConnection} conn
 * @param {number} classId
 */
export async function pickNextWaitingForUpdate(conn, classId) {
  const attempts = [
    "SELECT * FROM `Waitlist` WHERE `classId` = ? AND `status` = 'waiting' ORDER BY `createdAt` ASC, `id` ASC LIMIT 1 FOR UPDATE",
    "SELECT * FROM `Waitlist` WHERE `classId` = ? AND `status` = 'waiting' ORDER BY `id` ASC LIMIT 1 FOR UPDATE",
    "SELECT * FROM `Waitlist` WHERE `classId` = ? ORDER BY `id` ASC LIMIT 1 FOR UPDATE",
  ];
  let lastErr;
  for (const sql of attempts) {
    try {
      const [rows] = await conn.query(sql, [classId]);
      return rows[0] ?? null;
    } catch (e) {
      lastErr = e;
      if (e && e.code === "ER_BAD_FIELD_ERROR") continue;
      throw e;
    }
  }
  throw lastErr ?? new Error("pickNextWaitingForUpdate: no compatible Waitlist schema");
}

/**
 * FIFO position among active waiting entries (stable with concurrency: based on committed rows).
 * @param {number} userId
 * @param {number} classId
 */
export async function getWaitlistPosition(userId, classId) {
  const pool = getPool();
  if (!pool) return null;
  const [rows] = await pool.query(
    `SELECT 1 + (
        SELECT COUNT(*)
        FROM \`Waitlist\` w2
        WHERE w2.\`classId\` = w.\`classId\`
          AND w2.\`status\` = 'waiting'
          AND (w2.\`createdAt\` < w.\`createdAt\` OR (w2.\`createdAt\` = w.\`createdAt\` AND w2.\`id\` < w.\`id\`))
      ) AS position
     FROM \`Waitlist\` w
     WHERE w.\`userId\` = ? AND w.\`classId\` = ? AND w.\`status\` = 'waiting'
     LIMIT 1`,
    [userId, classId]
  );
  const pos = rows[0]?.position;
  return pos == null ? null : Number(pos);
}

const ACTIVE_RESERVATION_STATUSES = "('pending', 'confirmed')";

/**
 * Join waitlist only when class is full (no free slot), future, not cancelled, and user has no active booking.
 * @returns {Promise<{ ok: true, waitlistId: number, position: number } | { ok: false, code: string }>}
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
      `SELECT \`id\` FROM \`Reservations\` WHERE \`userId\` = ? AND \`classId\` = ? AND \`status\` IN ${ACTIVE_RESERVATION_STATUSES} LIMIT 1`,
      [userId, classId]
    );
    if (activeRows.length > 0) {
      await conn.rollback();
      return { ok: false, code: "ALREADY_BOOKED" };
    }
    const existingAny = await findAnyWaitlistEntryForUpdate(conn, userId, classId);
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
      const position = await getWaitlistPosition(userId, classId);
      return { ok: true, waitlistId: Number(existingAny.id), position: position ?? 1 };
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
    const position = await getWaitlistPosition(userId, classId);
    return { ok: true, waitlistId, position: position ?? 1 };
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
  const [result] = await pool.query(
    "UPDATE `Waitlist` SET `status` = 'removed' WHERE `userId` = ? AND `classId` = ? AND `status` = 'waiting'",
    [userId, classId]
  );
  return result.affectedRows > 0;
}

/** @param {number} userId */
export async function listWaitlistByUserId(userId) {
  const pool = getPool();
  if (!pool) return [];
  const [rows] = await pool.query(
    `SELECT q.*,
      CASE
        WHEN q.status = 'waiting' THEN 1 + (
          SELECT COUNT(*)
          FROM \`Waitlist\` w2
          WHERE w2.\`classId\` = q.classId
            AND w2.\`status\` = 'waiting'
            AND (w2.\`createdAt\` < q.createdAt OR (w2.\`createdAt\` = q.createdAt AND w2.\`id\` < q.id))
        )
        ELSE NULL
      END AS position
     FROM (${listSelect}
       WHERE w.\`userId\` = ? AND w.\`status\` = 'waiting' AND c.\`startsAt\` >= NOW(6) AND c.\`cancellationReason\` IS NULL
       ORDER BY c.startsAt ASC
     ) q`,
    [userId]
  );
  return rows;
}

/**
 * When a class session has started: clear remaining waiters (no further promotions).
 * @returns {Promise<number>}
 */
export async function cleanupWaitlistForStartedClasses() {
  const pool = getPool();
  if (!pool) return 0;
  const [result] = await pool.query(
    `UPDATE \`Waitlist\` w
     INNER JOIN \`Classes\` c ON c.id = w.classId
     SET w.\`status\` = 'removed'
     WHERE c.\`startsAt\` <= NOW(6) AND w.\`status\` = 'waiting'`
  );
  return result.affectedRows ?? 0;
}
