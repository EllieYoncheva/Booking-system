import { TABLES } from "./constants.js";

/** Table `Instructors` in booking_system.sql */
export const instructorTable = TABLES.instructors;

/**
 * Column identifiers on `Instructors` (camelCase; match mysql2 row keys).
 * @type {Readonly<Record<keyof import("./types.js").Instructor, string>>}
 */
export const instructorColumns = Object.freeze({
  id: "id",
  firstName: "firstName",
  lastName: "lastName",
  phone: "phone",
  email: "email",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
  deletedAt: "deletedAt",
});
