import { TABLES } from "./constants.js";

/** Table `Services` in booking_system.sql */
export const serviceTable = TABLES.services;

/**
 * Column identifiers on `Services` (camelCase; match mysql2 row keys).
 * @type {Readonly<Record<keyof import("./types.js").Service, string>>}
 */
export const serviceColumns = Object.freeze({
  id: "id",
  name: "name",
  description: "description",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
  deletedAt: "deletedAt",
});
