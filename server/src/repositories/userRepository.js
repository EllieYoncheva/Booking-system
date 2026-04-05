import { getKnex } from "../db/knex.js";

function users() {
  return getKnex()("Users");
}

/** @param {string} sub */
export async function findUserByKeycloakSub(sub) {
  return users().where({ keycloakSub: sub }).whereNull("deletedAt").first();
}

/** @param {string} email */
export async function findUserByEmail(email) {
  return users().where({ email }).whereNull("deletedAt").first();
}

/** @param {number} id */
export async function findUserById(id) {
  return users().where({ id }).whereNull("deletedAt").first();
}

/**
 * @param {Omit<import("../entities/types.js").User, "id"|"createdAt"|"updatedAt"|"deletedAt"> & { keycloakSub?: string | null }} row
 */
export async function insertUser(row) {
  const [insertId] = await users().insert(row);
  return findUserById(insertId);
}

/**
 * @param {number} id
 * @param {Partial<import("../entities/types.js").User>} patch
 */
export async function updateUser(id, patch) {
  await users().where({ id }).update(patch);
  return findUserById(id);
}

/** @param {{ limit?: number, offset?: number }} [opts] */
export async function listUsers(opts = {}) {
  const { limit = 50, offset = 0 } = opts;
  return users().whereNull("deletedAt").orderBy("id", "asc").limit(limit).offset(offset);
}
