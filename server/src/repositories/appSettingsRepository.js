import { getKnex } from "../db/knex.js";

function table() {
  return getKnex()("AppSettings");
}

/** @param {string} key */
export async function getSetting(key) {
  const row = await table().where({ key }).first();
  return row?.value ?? null;
}

/**
 * @param {string} key
 * @param {string} value
 */
export async function upsertSetting(key, value) {
  const kn = getKnex();
  const n = await kn("AppSettings").where({ key }).update({ value });
  if (n === 0) await kn("AppSettings").insert({ key, value });
  return getSetting(key);
}

/** @param {string} key */
export async function getBooleanSetting(key, defaultValue = false) {
  const raw = await getSetting(key);
  if (raw == null) return defaultValue;
  const s = String(raw).trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes";
}
