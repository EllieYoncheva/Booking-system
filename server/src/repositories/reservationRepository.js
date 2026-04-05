import { getKnex } from "../db/knex.js";

function reservations() {
  return getKnex()("Reservations");
}

/** @param {number} id */
export async function findReservationById(id) {
  return reservations().where({ id }).first();
}

/**
 * @param {number} userId
 * @param {{ classId?: number, status?: string, limit?: number, offset?: number }} filters
 */
export async function listReservationsForUser(userId, filters = {}) {
  const { classId, status, limit = 50, offset = 0 } = filters;
  const q = reservations().where({ userId }).orderBy("createdAt", "desc");
  if (classId != null) q.andWhere({ classId });
  if (status) q.andWhere({ status });
  return q.limit(limit).offset(offset);
}

/**
 * @param {{ userId?: number, classId?: number, status?: string, limit?: number, offset?: number }} filters
 */
export async function listReservationsAdmin(filters = {}) {
  const { userId, classId, status, limit = 50, offset = 0 } = filters;
  const q = reservations().orderBy("createdAt", "desc");
  if (userId != null) q.andWhere({ userId });
  if (classId != null) q.andWhere({ classId });
  if (status) q.andWhere({ status });
  return q.limit(limit).offset(offset);
}

/**
 * @param {{ userId: number, classId: number, status?: string }} row
 */
export async function insertReservation(row) {
  const [insertId] = await reservations().insert({
    userId: row.userId,
    classId: row.classId,
    status: row.status ?? "pending",
  });
  return findReservationById(insertId);
}

/**
 * @param {number} id
 * @param {string} status
 * @param {Date | null} cancelledAt
 */
export async function updateReservationStatus(id, status, cancelledAt) {
  await reservations().where({ id }).update({ status, cancelledAt });
  return findReservationById(id);
}
