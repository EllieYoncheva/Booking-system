export const MAX_ACTIVE_RESERVATIONS = 5;

export const MAX_ACTIVE_RESERVATIONS_MESSAGE =
  "Достигнахте максималния брой от 5 активни резервации.";

const ACTIVE_STATUSES = new Set(["pending", "confirmed", "reserved"]);

/** @param {Record<string, unknown>} reservation */
export function isActiveReservation(reservation) {
  if (!ACTIVE_STATUSES.has(String(reservation.status))) return false;
  const startsAt = new Date(reservation.classStartsAt).getTime();
  return Number.isFinite(startsAt) && startsAt >= Date.now();
}

/** @param {Array<Record<string, unknown>>} reservations */
export function countActiveReservations(reservations) {
  let count = 0;
  for (const reservation of reservations) {
    if (isActiveReservation(reservation)) count += 1;
  }
  return count;
}

/** @param {Array<Record<string, unknown>>} reservations */
export function hasReachedActiveReservationLimit(reservations) {
  return countActiveReservations(reservations) >= MAX_ACTIVE_RESERVATIONS;
}
