import { TABLES } from "./constants.js";

/** Table `Waitlist` in booking_system.sql */
export const waitlistTable = TABLES.waitlist;

/**
 * Column identifiers on `Waitlist` (camelCase; match mysql2 row keys).
 * @type {Readonly<Record<keyof import("./types.js").WaitlistEntry, string>>}
 */
export const waitlistColumns = Object.freeze({
  id: "id",
  position: "position",
  notifiedAt: "notifiedAt",
  userId: "userId",
  classId: "classId",
});
