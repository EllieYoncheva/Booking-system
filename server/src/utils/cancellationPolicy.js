/** Minimum hours before class start when a client may still cancel. */
export const CLIENT_CANCEL_MIN_HOURS = 3;

const MS_PER_HOUR = 60 * 60 * 1000;

export const CLIENT_CANCEL_TOO_LATE_MESSAGE =
  "Анулирането е възможно най-късно 3 часа преди началото на часа.";

/**
 * Client may cancel while at least {@link CLIENT_CANCEL_MIN_HOURS} remain before class
 * (e.g. with 3 hours left — yes; with 2 hours or less — no).
 *
 * @param {string|Date|null|undefined} classStartsAt
 */
export function canClientCancelBeforeClass(classStartsAt) {
  const start = new Date(classStartsAt).getTime();
  if (!Number.isFinite(start)) return false;
  const cutoff = start - CLIENT_CANCEL_MIN_HOURS * MS_PER_HOUR;
  return Date.now() <= cutoff;
}
