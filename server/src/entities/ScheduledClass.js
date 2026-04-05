import { TABLES } from "./constants.js";

/** Table `Classes` (scheduled sessions) in booking_system.sql */
export const scheduledClassTable = TABLES.classes;

/**
 * Column identifiers on `Classes` (camelCase; match mysql2 row keys).
 * @type {Readonly<Record<keyof import("./types.js").ScheduledClass, string>>}
 */
export const scheduledClassColumns = Object.freeze({
  id: "id",
  name: "name",
  description: "description",
  startsAt: "startsAt",
  endsAt: "endsAt",
  price: "price",
  capacity: "capacity",
  serviceId: "serviceId",
  studioId: "studioId",
  instructorId: "instructorId",
  cancellationReason: "cancellationReason",
});
