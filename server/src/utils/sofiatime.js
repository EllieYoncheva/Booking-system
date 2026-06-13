/** Business timezone — class times are stored and displayed in Sofia local time. */
export const BUSINESS_TZ = "Europe/Sofia";

const SOFIA_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: BUSINESS_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const SOFIA_WEEKDAY = new Intl.DateTimeFormat("en-US", {
  timeZone: BUSINESS_TZ,
  weekday: "short",
});

const WEEKDAY_TO_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/**
 * @param {Date | string | number} date
 */
export function toSofiaParts(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid date: ${String(date)}`);

  /** @type {Record<string, string>} */
  const parts = {};
  for (const part of SOFIA_FORMATTER.formatToParts(d)) {
    if (part.type !== "literal") parts[part.type] = part.value;
  }
  if (parts.hour === "24") parts.hour = "00";
  return parts;
}

/**
 * Offset between UTC instant and Sofia wall-clock at that instant.
 * @param {Date} date
 */
function getTimeZoneOffsetMs(date) {
  const formatted = SOFIA_FORMATTER.formatToParts(date);
  const map = Object.fromEntries(formatted.filter((p) => p.type !== "literal").map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second)
  );
  return asUtc - date.getTime();
}

/**
 * Parse a naive MySQL DATETIME (Sofia wall clock) into a UTC instant.
 * @param {string | Date} value
 * @returns {Date}
 */
export function fromSofiaWallClock(value) {
  if (value instanceof Date) return value;

  const raw = String(value).trim().replace(" ", "T").slice(0, 19);
  const [datePart, timePart] = raw.split("T");
  if (!datePart || !timePart) throw new Error(`Invalid Sofia wall clock: ${String(value)}`);

  const [y, mo, d] = datePart.split("-").map(Number);
  const [h, mi, s] = timePart.split(":").map(Number);
  const utcGuess = Date.UTC(y, mo - 1, d, h, mi, s ?? 0);
  const offset = getTimeZoneOffsetMs(new Date(utcGuess));
  return new Date(utcGuess - offset);
}

/**
 * Format an instant as MySQL DATETIME(6) literal in Sofia wall clock.
 * @param {string | Date} v
 * @returns {string}
 */
export function toSofiaMysqlDateTime(v) {
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid datetime: ${String(v)}`);

  const p = toSofiaParts(d);
  const ms = String(d.getMilliseconds()).padStart(3, "0");
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}.${ms}000`;
}

/**
 * @param {string | Date | number} value
 * @returns {string} YYYY-MM-DD in Sofia
 */
export function sofiaDateOnly(value) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.slice(0, 10))) {
    return value.slice(0, 10);
  }
  const p = toSofiaParts(value);
  return `${p.year}-${p.month}-${p.day}`;
}

/**
 * @param {string | Date | number} dateValue
 * @param {string} startTime HH:mm
 * @returns {Date}
 */
export function combineSofiaDateAndTime(dateValue, startTime) {
  const date = sofiaDateOnly(dateValue);
  const time = String(startTime).slice(0, 5);
  return fromSofiaWallClock(`${date}T${time}:00`);
}

/**
 * @param {Date | string | number} instant
 * @returns {number} 0=Sun … 6=Sat in Sofia
 */
export function sofiaDayOfWeek(instant) {
  const label = SOFIA_WEEKDAY.format(instant instanceof Date ? instant : new Date(instant));
  return WEEKDAY_TO_INDEX[label] ?? 0;
}

/**
 * @param {string} dateStr YYYY-MM-DD
 * @param {number} count
 * @returns {string}
 */
export function addSofiaCalendarDays(dateStr, count) {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const next = new Date(Date.UTC(y, mo - 1, d + count));
  const yy = next.getUTCFullYear();
  const mm = String(next.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(next.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}
