import { TABLES } from "./constants.js";

/** Table `Notifications` in booking_system.sql */
export const notificationTable = TABLES.notifications;

/**
 * Column identifiers on `Notifications` (camelCase; match mysql2 row keys).
 * @type {Readonly<Record<keyof import("./types.js").Notification, string>>}
 */
export const notificationColumns = Object.freeze({
  id: "id",
  channel: "channel",
  type: "type",
  status: "status",
  sentAt: "sentAt",
  createdAt: "createdAt",
  userId: "userId",
  reservationId: "reservationId",
  classId: "classId",
});
