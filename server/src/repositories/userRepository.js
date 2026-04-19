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

/**
 * @param {{ limit?: number, offset?: number, search?: string }} [opts]
 */
export async function listUsers(opts = {}) {
  const { limit = 50, offset = 0, search } = opts;
  let q = users().whereNull("deletedAt");
  if (search && String(search).trim()) {
    const term = `%${String(search).trim()}%`;
    q = q.where(function addSearch() {
      this.where("email", "like", term)
        .orWhere("firstName", "like", term)
        .orWhere("lastName", "like", term)
        .orWhere("phone", "like", term);
    });
  }
  return q.orderBy("id", "asc").limit(limit).offset(offset);
}

/**
 * @param {'admin'|'client'} role
 * @param {{ limit?: number, offset?: number, search?: string }} [opts]
 */
export async function listUsersByRole(role, opts = {}) {
  const { limit = 50, offset = 0, search } = opts;
  let q = users().whereNull("deletedAt").andWhere({ role });
  if (search && String(search).trim()) {
    const term = `%${String(search).trim()}%`;
    q = q.where(function addSearch() {
      this.where("email", "like", term)
        .orWhere("firstName", "like", term)
        .orWhere("lastName", "like", term)
        .orWhere("phone", "like", term);
    });
  }
  return q.orderBy("id", "asc").limit(limit).offset(offset);
}
