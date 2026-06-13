import { TABLES } from "./constants.js";

/** Table `Users` in booking_system.sql */
export const userTable = TABLES.users;

/**
 * Column identifiers on `Users` (camelCase; match mysql2 row keys).
 * @type {Readonly<Record<keyof import("./types.js").User, string>>}
 */
export const userColumns = Object.freeze({
  id: "id",
  firstName: "firstName",
  lastName: "lastName",
  email: "email",
  phone: "phone",
  keycloakSub: "keycloakSub",
  passwordHash: "passwordHash",
  role: "role",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
  deletedAt: "deletedAt",
  notes: "notes",
  internalNotes: "internalNotes",
});
