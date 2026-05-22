/** Minimum hours before class start when a client may cancel. */
export const CLIENT_CANCEL_MIN_HOURS = 2;

export const CLIENT_CANCEL_TOO_LATE_MESSAGE =
  "Анулирането е възможно най-малко 3 часа преди началото на часа.";

/**
 * @param {string|Date|null|undefined} classStartsAt
 */
export function canClientCancelBeforeClass(classStartsAt) {
  const start = new Date(classStartsAt).getTime();
  if (!Number.isFinite(start)) return false;
  const cutoff = start - CLIENT_CANCEL_MIN_HOURS * 60 * 60 * 1000;
  return Date.now() < cutoff;
}
