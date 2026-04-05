import { getKnex } from "../db/knex.js";

function studios() {
  return getKnex()("Studios");
}

export async function findStudioById(id) {
  return studios().where({ id }).whereNull("deletedAt").first();
}

export async function listStudios() {
  return studios().whereNull("deletedAt").orderBy("id", "asc");
}

/** @param {Record<string, unknown>} row */
export async function insertStudio(row) {
  const [insertId] = await studios().insert(row);
  return findStudioById(insertId);
}

/** @param {number} id @param {Record<string, unknown>} patch */
export async function updateStudio(id, patch) {
  await studios().where({ id }).update(patch);
  return findStudioById(id);
}

export async function deleteStudioSoft(id) {
  await studios().where({ id }).update({ deletedAt: getKnex().fn.now() });
}
