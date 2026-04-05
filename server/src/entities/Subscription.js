import { TABLES } from "./constants.js";

/** Table `Subscription` in booking_system.sql */
export const subscriptionTable = TABLES.subscription;

/**
 * Column identifiers on `Subscription` (camelCase; match mysql2 row keys).
 * @type {Readonly<Record<keyof import("./types.js").Subscription, string>>}
 */
export const subscriptionColumns = Object.freeze({
  id: "id",
  totalVisits: "totalVisits",
  remaining: "remaining",
  validUntil: "validUntil",
  userId: "userId",
});
