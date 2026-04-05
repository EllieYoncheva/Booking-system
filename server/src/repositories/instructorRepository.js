import { getKnex } from "../db/knex.js";

function instructors() {
  return getKnex()("Instructors");
}

export async function findInstructorById(id) {
  return instructors().where({ id }).whereNull("deletedAt").first();
}

export async function listInstructors() {
  return instructors().whereNull("deletedAt").orderBy("id", "asc");
}

/** @param {Record<string, unknown>} row */
export async function insertInstructor(row) {
  const [insertId] = await instructors().insert(row);
  return findInstructorById(insertId);
}

/** @param {number} id @param {Record<string, unknown>} patch */
export async function updateInstructor(id, patch) {
  await instructors().where({ id }).update(patch);
  return findInstructorById(id);
}

export async function deleteInstructorSoft(id) {
  await instructors().where({ id }).update({ deletedAt: getKnex().fn.now() });
}
