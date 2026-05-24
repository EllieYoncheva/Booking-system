import * as reservationRepository from "../repositories/reservationRepository.js";
import { sendEmail, isEmailConfigured } from "./emailService.js";

/** @param {string|Date|null|undefined} iso */
function formatDayBg(iso) {
  try {
    return new Date(iso).toLocaleDateString("bg-BG", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return String(iso ?? "—");
  }
}

/** @param {string|Date|null|undefined} iso */
function formatTimeBg(iso) {
  try {
    return new Date(iso).toLocaleTimeString("bg-BG", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return String(iso ?? "—");
  }
}

/** @param {Record<string, unknown>} row */
function classTitle(row) {
  const name =
    typeof row.className === "string" && row.className.trim()
      ? row.className.trim()
      : "";
  return name || String(row.serviceName ?? "Клас");
}

/** @param {Record<string, unknown>} row */
function timeRange(row) {
  const start = formatTimeBg(row.classStartsAt);
  const end = row.classEndsAt ? formatTimeBg(row.classEndsAt) : null;
  return end ? `${start}–${end}` : start;
}

/**
 * @param {number} reservationId
 */
export async function sendReservationConfirmedEmail(reservationId) {
  if (!isEmailConfigured()) return { ok: false, code: "NOT_CONFIGURED" };

  const row = await reservationRepository.findReservationEmailContext(reservationId);
  if (!row) return { ok: false, code: "NOT_FOUND" };

  const to = String(row.clientEmail ?? "").trim();
  if (!to) return { ok: false, code: "NO_RECIPIENT" };

  const firstName = String(row.clientFirstName ?? "").trim() || "клиент";
  const title = classTitle(row);
  const studio = String(row.studioName ?? "").trim() || "—";
  const date = formatDayBg(row.classStartsAt);
  const hours = timeRange(row);

  const subject = `Потвърдена резервация — ${title}`;
  const text = [
    `Здравейте, ${firstName},`,
    "",
    "Резервацията ви е потвърдена.",
    "",
    `Клас: ${title}`,
    `Студио: ${studio}`,
    `Дата: ${date}`,
    `Час: ${hours}`,
    "",
    "До скоро!",
  ].join("\n");

  return sendEmail({ to, subject, text });
}
