export const STUDIO_STORAGE_KEY = "booking.selectedStudioId";

/** @param {unknown} value */
export function parseStudioId(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * @param {Array<Record<string, unknown>>} studios
 * @param {URLSearchParams} searchParams
 */
export function resolveInitialStudioId(studios, searchParams) {
  const ids = new Set(studios.map((s) => Number(s.id)));
  const fromUrl = parseStudioId(searchParams.get("studioId"));
  if (fromUrl != null && ids.has(fromUrl)) return fromUrl;
  try {
    const fromStorage = parseStudioId(sessionStorage.getItem(STUDIO_STORAGE_KEY));
    if (fromStorage != null && ids.has(fromStorage)) return fromStorage;
  } catch {
    /* ignore */
  }
  if (studios.length === 1) return Number(studios[0].id);
  return null;
}

/** @param {Record<string, unknown>} studio */
export function studioOptionLabel(studio) {
  const name = String(studio.name ?? "").trim();
  const city = studio.city ? String(studio.city).trim() : "";
  return city ? `${name} · ${city}` : name;
}

/** @param {Record<string, unknown>} studio */
export function studioDetailLine(studio) {
  return [studio.city, studio.address]
    .map((v) => (v ? String(v).trim() : ""))
    .filter(Boolean)
    .join(", ");
}
