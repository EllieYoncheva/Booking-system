import * as studioRepository from "../repositories/studioRepository.js";
import { AppError, assertFound } from "../errors/AppError.js";

export async function listStudios() {
  return studioRepository.listStudios();
}

/** @param {Record<string, unknown>} body */
export async function createStudio(body) {
  return studioRepository.insertStudio(body);
}

/** @param {number} id @param {Record<string, unknown>} patch */
export async function updateStudio(id, patch) {
  if (Object.keys(patch).length === 0) {
    throw new AppError("No fields to update", 400, "EMPTY_PATCH");
  }
  assertFound(await studioRepository.findStudioById(id), "Studio not found", "STUDIO_NOT_FOUND");
  return studioRepository.updateStudio(id, patch);
}

/** @param {number} id */
export async function deleteStudio(id) {
  assertFound(await studioRepository.findStudioById(id), "Studio not found", "STUDIO_NOT_FOUND");
  await studioRepository.deleteStudioSoft(id);
}
