/** Minimum hours before class start when a client may still reserve. */
export const CLIENT_BOOKING_MIN_HOURS = 1;

const MS_PER_HOUR = 60 * 60 * 1000;

export const CLIENT_BOOKING_TOO_LATE_MESSAGE =
  "Резервацията е възможна най-късно 1 час преди началото на часа.";

/**
 * Client may reserve while at least {@link CLIENT_BOOKING_MIN_HOURS} remain before class
 * (e.g. with 1 hour left — yes; with less than 1 hour — no).
 *
 * @param {string|Date|null|undefined} classStartsAt
 */
export function canClientBookBeforeClass(classStartsAt) {
  const start = new Date(classStartsAt).getTime();
  if (!Number.isFinite(start)) return false;
  const cutoff = start - CLIENT_BOOKING_MIN_HOURS * MS_PER_HOUR;
  return Date.now() <= cutoff;
}
