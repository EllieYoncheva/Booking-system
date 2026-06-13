import { toSofiaMysqlDateTime } from "./sofiatime.js";

/**
 * Values for INSERT/UPDATE into MySQL DATETIME(6).
 * ISO strings with a "Z" suffix are rejected by MySQL (ER_TRUNCATED_WRONG_VALUE).
 * Some mysql2 versions also serialize JavaScript Date to that same ISO-Z form.
 * We store Sofia wall-clock literals: YYYY-MM-DD HH:mm:ss.SSSSSS
 *
 * @param {string | Date} v
 * @returns {string}
 */
export function toMysqlDateTime(v) {
  return toSofiaMysqlDateTime(v);
}
