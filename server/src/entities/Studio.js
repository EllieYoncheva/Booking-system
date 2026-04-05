import { TABLES } from "./constants.js";

/** Table `Studios` in booking_system.sql */
export const studioTable = TABLES.studios;

/**
 * Column identifiers on `Studios` (camelCase; match mysql2 row keys).
 * @type {Readonly<Record<keyof import("./types.js").Studio, string>>}
 */
export const studioColumns = Object.freeze({
  id: "id",
  name: "name",
  country: "country",
  city: "city",
  address: "address",
  phone: "phone",
  email: "email",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
  deletedAt: "deletedAt",
});
