import { getKnex } from "../db/knex.js";

function services() {
  return getKnex()("Services");
}

export async function findServiceOfferingById(id) {
  return services().where({ id }).whereNull("deletedAt").first();
}

export async function listServiceOfferings() {
  return services().whereNull("deletedAt").orderBy("id", "asc");
}

/** @param {Record<string, unknown>} row */
export async function insertServiceOffering(row) {
  const [insertId] = await services().insert(row);
  return findServiceOfferingById(insertId);
}

/** @param {number} id @param {Record<string, unknown>} patch */
export async function updateServiceOffering(id, patch) {
  await services().where({ id }).update(patch);
  return findServiceOfferingById(id);
}

export async function deleteServiceOfferingSoft(id) {
  await services().where({ id }).update({ deletedAt: getKnex().fn.now() });
}
