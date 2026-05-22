/** @param {string} iso */
export function localDateKey(iso) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** @param {string} iso */
export function formatDayHeading(iso) {
  try {
    return new Date(iso).toLocaleDateString("bg-BG", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return String(iso);
  }
}

/** @param {string} iso */
export function formatTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString("bg-BG", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return String(iso);
  }
}

/**
 * @param {Array<Record<string, unknown>>} rows
 * @param {string} [dateField]
 * @returns {Array<[string, Array<Record<string, unknown>>]>}
 */
export function groupRowsByDate(rows, dateField = "classStartsAt") {
  const map = new Map();
  for (const row of rows) {
    const key = localDateKey(String(row[dateField]));
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
}

/** @param {Record<string, unknown>} row */
export function classTitleFromRow(row) {
  const name =
    typeof row.className === "string" && row.className.trim()
      ? row.className.trim()
      : typeof row.name === "string" && row.name.trim()
        ? row.name.trim()
        : "";
  return name || String(row.serviceName ?? "Клас");
}

/** @param {Record<string, unknown>} row */
export function serviceDurationMins(row) {
  const mins = Number(row.serviceDuration);
  return Number.isFinite(mins) && mins > 0 ? mins : null;
}
