import { TABLES } from "./constants.js";

/** Table `Schedules` for recurring class definitions. */
export const scheduleTable = TABLES.schedules;

/**
 * Column identifiers on `Schedules` (camelCase; match mysql2 row keys).
 * @type {Readonly<Record<keyof import("./types.js").Schedule, string>>}
 */
export const scheduleColumns = Object.freeze({
  id: "id",
  classId: "classId",
  recurrenceRule: "recurrenceRule",
  startDate: "startDate",
  endDate: "endDate",
  daysOfWeek: "daysOfWeek",
  startTime: "startTime",
});
