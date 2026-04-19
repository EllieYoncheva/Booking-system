import { TABLES } from "./constants.js";

/** Table `Reservations` in booking_system.sql */
export const reservationTable = TABLES.reservations;

/**
 * Column identifiers on `Reservations` (camelCase; match mysql2 row keys).
 * @type {Readonly<Record<keyof import("./types.js").Reservation, string>>}
 */
export const reservationColumns = Object.freeze({
  id: "id",
  createdAt: "createdAt",
  cancelledAt: "cancelledAt",
  status: "status",
  userId: "userId",
  classId: "classId",
  adminCancelReason: "adminCancelReason",
});
