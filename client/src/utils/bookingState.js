/**
 * @param {Array<Record<string, unknown>>} reservations
 * @returns {Set<number>}
 */
export function activeBookedClassIds(reservations) {
  const ids = new Set();
  const now = Date.now();
  for (const r of reservations) {
    if (r.status !== "pending" && r.status !== "confirmed") continue;
    const t = new Date(r.classStartsAt).getTime();
    if (Number.isFinite(t) && t >= now) ids.add(Number(r.classId));
  }
  return ids;
}
