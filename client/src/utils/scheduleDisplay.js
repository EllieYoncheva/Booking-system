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

/** @param {Record<string, unknown>} row */
export function instructorNameFromRow(row) {
  return [row.instructorFirstName, row.instructorLastName]
    .filter(Boolean)
    .join(" ")
    .trim();
}

/** @param {Record<string, unknown>} row */
export function instructorInitialsFromRow(row) {
  const first = String(row.instructorFirstName ?? "").trim();
  const last = String(row.instructorLastName ?? "").trim();
  if (first && last) return `${first[0]}${last[0]}`.toUpperCase();
  if (first.length >= 2) return first.slice(0, 2).toUpperCase();
  if (first) return first[0].toUpperCase();
  if (last.length >= 2) return last.slice(0, 2).toUpperCase();
  if (last) return last[0].toUpperCase();
  return "?";
}

/**
 * @param {Record<string, unknown>} row
 * @returns {string} e.g. "10:00–10:50"
 */
export function formatTimeRange(row) {
  const start = row.startsAt ?? row.classStartsAt;
  if (!start) return "—";
  const end = row.endsAt ?? row.classEndsAt;
  if (end) {
    return `${formatTime(String(start))}–${formatTime(String(end))}`;
  }
  const mins = serviceDurationMins(row);
  if (mins) {
    const endDate = new Date(start);
    endDate.setMinutes(endDate.getMinutes() + mins);
    return `${formatTime(String(start))}–${formatTime(endDate.toISOString())}`;
  }
  return formatTime(String(start));
}
