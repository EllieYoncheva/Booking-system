import { getPool } from "../db/pool.js";
import * as classRepository from "./classRepository.js";

const DEFAULT_GENERATION_DAYS = 90;
const ICAL_DAYS = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
};

const scheduleSelect = `
  SELECT sc.*,
    c.name AS className,
    c.description AS classDescription,
    c.price AS classPrice,
    c.capacity AS classCapacity,
    c.serviceId,
    c.studioId,
    c.instructorId,
    c.cancellationReason,
    s.duration AS serviceDuration
  FROM \`Schedules\` sc
  INNER JOIN \`Classes\` c ON c.id = sc.classId
  INNER JOIN \`Services\` s ON s.id = c.serviceId AND s.deletedAt IS NULL
`;

function normalizeDays(days) {
  if (days == null || days === "") return [];
  let parsed = days;
  if (typeof days === "string") {
    try {
      parsed = JSON.parse(days);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return [...new Set(parsed.map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6))];
}

function daysFromRecurrenceRule(rule) {
  const byDay = String(rule ?? "").match(/(?:^|;)BYDAY=([^;]+)/i);
  if (!byDay) return [];
  return byDay[1]
    .split(",")
    .map((part) => ICAL_DAYS[part.trim().toUpperCase()])
    .filter((n) => Number.isInteger(n));
}

function recurrenceKind(rule) {
  const value = String(rule ?? "").trim().toLowerCase();
  if (value.includes("freq=daily") || value === "daily") return "daily";
  if (value.includes("freq=weekly") || value === "weekly") return "weekly";
  if (value.includes("freq=monthly") || value === "monthly") return "monthly";
  return value;
}

function dateOnly(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function addDays(date, count) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + count);
  return next;
}

function combineDateAndTime(date, startTime) {
  const time = String(startTime).slice(0, 5);
  return new Date(`${dateOnly(date)}T${time}:00`);
}

function shouldGenerateForDate(date, schedule, daysOfWeek, monthlyDay) {
  const kind = recurrenceKind(schedule.recurrenceRule);
  const ruleDays = daysFromRecurrenceRule(schedule.recurrenceRule);
  const activeDays = daysOfWeek.length > 0 ? daysOfWeek : ruleDays;
  if (kind === "daily") {
    return activeDays.length === 0 || activeDays.includes(date.getUTCDay());
  }
  if (kind === "weekly") {
    const weeklyDays = activeDays.length > 0 ? activeDays : [new Date(schedule.startDate).getUTCDay()];
    return weeklyDays.includes(date.getUTCDay());
  }
  if (kind === "monthly") {
    return date.getUTCDate() === monthlyDay;
  }
  return false;
}

export async function listSchedules() {
  const pool = getPool();
  if (!pool) return [];
  const [rows] = await pool.query(`${scheduleSelect} ORDER BY sc.startDate DESC, sc.startTime DESC`);
  return rows;
}

export async function findScheduleById(id) {
  const pool = getPool();
  if (!pool) return null;
  const [rows] = await pool.query(`${scheduleSelect} WHERE sc.\`id\` = ? LIMIT 1`, [id]);
  return rows[0] ?? null;
}

export async function insertSchedule(row) {
  const pool = getPool();
  if (!pool) throw new Error("Database not configured");
  const [result] = await pool.query(
    "INSERT INTO `Schedules` (`classId`, `recurrenceRule`, `startDate`, `endDate`, `daysOfWeek`, `startTime`) VALUES (?, ?, ?, ?, ?, ?)",
    [
      row.classId,
      row.recurrenceRule,
      dateOnly(row.startDate),
      row.endDate ? dateOnly(row.endDate) : null,
      JSON.stringify(row.daysOfWeek ?? []),
      row.startTime,
    ]
  );
  return result.insertId;
}

export async function updateSchedule(id, patch) {
  const pool = getPool();
  if (!pool) throw new Error("Database not configured");
  const allowed = ["classId", "recurrenceRule", "startDate", "endDate", "daysOfWeek", "startTime"];
  const keys = allowed.filter((k) => patch[k] !== undefined);
  if (keys.length === 0) return;
  const set = keys.map((k) => `\`${k}\` = ?`).join(", ");
  const values = keys.map((k) => {
    if (k === "daysOfWeek") return JSON.stringify(patch[k] ?? []);
    if (k === "startDate" || k === "endDate") return patch[k] ? dateOnly(patch[k]) : null;
    return patch[k];
  });
  values.push(id);
  await pool.query(`UPDATE \`Schedules\` SET ${set} WHERE \`id\` = ?`, values);
}

export async function deleteSchedule(id) {
  const pool = getPool();
  if (!pool) throw new Error("Database not configured");
  await pool.query("DELETE FROM `Schedules` WHERE `id` = ?", [id]);
}

export function buildOccurrences(schedule) {
  const start = new Date(`${dateOnly(schedule.startDate)}T00:00:00Z`);
  const end = schedule.endDate
    ? new Date(`${dateOnly(schedule.endDate)}T00:00:00Z`)
    : addDays(start, DEFAULT_GENERATION_DAYS);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return [];

  const daysOfWeek = normalizeDays(schedule.daysOfWeek);
  const monthlyDay = start.getUTCDate();
  const duration = Number(schedule.serviceDuration);
  if (!Number.isFinite(duration) || duration < 1) return [];

  const occurrences = [];
  for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) {
    if (!shouldGenerateForDate(cursor, schedule, daysOfWeek, monthlyDay)) continue;
    const startsAt = combineDateAndTime(cursor, schedule.startTime);
    const endsAt = new Date(startsAt.getTime() + duration * 60 * 1000);
    occurrences.push({ startsAt, endsAt });
  }
  return occurrences;
}

export async function generateScheduleInstances(scheduleId) {
  const schedule = await findScheduleById(scheduleId);
  if (!schedule) return null;

  const template = await classRepository.findClassById(schedule.classId);
  if (!template) return null;
  const templateStart = new Date(template.startsAt).getTime();
  const occurrences = buildOccurrences(schedule);

  let generated = 0;
  let skipped = 0;
  for (const occurrence of occurrences) {
    if (occurrence.startsAt.getTime() === templateStart) {
      skipped += 1;
      continue;
    }
    try {
      await classRepository.insertClass({
        name: template.name,
        description: template.description,
        startsAt: occurrence.startsAt,
        endsAt: occurrence.endsAt,
        price: template.price,
        capacity: template.capacity,
        serviceId: template.serviceId,
        studioId: template.studioId,
        instructorId: template.instructorId,
        scheduleId,
        cancellationReason: template.cancellationReason,
      });
      generated += 1;
    } catch (err) {
      if (err && err.code === "ER_DUP_ENTRY") {
        skipped += 1;
        continue;
      }
      throw err;
    }
  }

  return { schedule, generated, skipped };
}
