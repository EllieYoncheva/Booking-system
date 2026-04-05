import mysql from "mysql2/promise";
import { config } from "../config.js";

/** @type {import("mysql2/promise").Pool | null} */
let pool = null;

/** @returns {import("mysql2/promise").Pool | null} */
export function getPool() {
  if (!config.databaseUrl?.trim()) return null;
  if (!pool) pool = mysql.createPool(config.databaseUrl);
  return pool;
}

/**
 * Ping the database. Does not throw — returns a status object for health checks.
 * @returns {Promise<{ configured: boolean, connected?: boolean, error?: string }>}
 */
export async function checkDatabaseConnection() {
  if (!config.databaseUrl?.trim()) {
    return { configured: false };
  }
  try {
    const p = getPool();
    if (!p) return { configured: false };
    await p.query("SELECT 1 AS ok");
    return { configured: true, connected: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { configured: true, connected: false, error: message };
  }
}
