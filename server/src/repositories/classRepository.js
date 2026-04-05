import { getKnex } from "../db/knex.js";

function classes() {
  return getKnex()("Classes");
}

/** @param {number} id */
export async function findClassById(id) {
  return classes().where({ id }).first();
}

/**
 * @param {{ from?: Date, to?: Date }} range
 */
export async function listClasses(range) {
  const q = classes().select("*").orderBy("startsAt", "asc");
  if (range.from) q.where("startsAt", ">=", range.from);
  if (range.to) q.where("startsAt", "<=", range.to);
  return q;
}

/**
 * @param {Omit<import("../entities/types.js").ScheduledClass, "id">} row
 */
export async function insertClass(row) {
  const [insertId] = await classes().insert(row);
  return findClassById(insertId);
}

/**
 * @param {number} id
 * @param {Partial<import("../entities/types.js").ScheduledClass>} patch
 */
export async function updateClass(id, patch) {
  await classes().where({ id }).update(patch);
  return findClassById(id);
}

/** @param {number} id */
export async function deleteClass(id) {
  return classes().where({ id }).del();
}

/** @param {number} classId */
export async function countActiveReservationsForClass(classId) {
  const row = await getKnex()("Reservations")
    .where({ classId })
    .whereIn("status", ["pending", "confirmed"])
    .count({ n: "*" })
    .first();
  return Number(row?.n ?? 0);
}

/** @param {number} classId */
export async function countAnyReservationsForClass(classId) {
  const row = await getKnex()("Reservations").where({ classId }).count({ n: "*" }).first();
  return Number(row?.n ?? 0);
}
