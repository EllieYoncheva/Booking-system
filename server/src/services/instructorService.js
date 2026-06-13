import * as instructorRepository from "../repositories/instructorRepository.js";
import { AppError, assertFound } from "../errors/AppError.js";

export async function listInstructors() {
  return instructorRepository.listInstructors();
}

/** @param {Record<string, unknown>} body */
export async function createInstructor(body) {
  return instructorRepository.insertInstructor(body);
}

/** @param {number} id @param {Record<string, unknown>} patch */
export async function updateInstructor(id, patch) {
  if (Object.keys(patch).length === 0) {
    throw new AppError("No fields to update", 400, "EMPTY_PATCH");
  }
  assertFound(await instructorRepository.findInstructorById(id), "Instructor not found", "INSTRUCTOR_NOT_FOUND");
  return instructorRepository.updateInstructor(id, patch);
}

/** @param {number} id */
export async function deleteInstructor(id) {
  assertFound(await instructorRepository.findInstructorById(id), "Instructor not found", "INSTRUCTOR_NOT_FOUND");
  await instructorRepository.deleteInstructorSoft(id);
}
