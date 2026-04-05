/**
 * Values for INSERT/UPDATE into MySQL DATETIME(6).
 * ISO strings with a "Z" suffix are rejected by MySQL (ER_TRUNCATED_WRONG_VALUE).
 * Some mysql2 versions also serialize JavaScript Date to that same ISO-Z form.
 * We send an explicit UTC wall-clock literal: YYYY-MM-DD HH:mm:ss.SSSSSS
 *
 * @param {string | Date} v
 * @returns {string}
 */
export function toMysqlDateTime(v) {
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid datetime: ${String(v)}`);

  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const h = String(d.getUTCHours()).padStart(2, "0");
  const mi = String(d.getUTCMinutes()).padStart(2, "0");
  const s = String(d.getUTCSeconds()).padStart(2, "0");
  const ms = String(d.getUTCMilliseconds()).padStart(3, "0");
  return `${y}-${mo}-${day} ${h}:${mi}:${s}.${ms}000`;
}
