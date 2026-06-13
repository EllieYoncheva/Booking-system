import { isActiveReservation } from "./activeReservationLimit.js";

/**
 * @param {Array<Record<string, unknown>>} reservations
 * @returns {Set<number>}
 */
export function activeBookedClassIds(reservations) {
  const ids = new Set();
  for (const r of reservations) {
    if (!isActiveReservation(r)) continue;
    ids.add(Number(r.classId));
  }
  return ids;
}
