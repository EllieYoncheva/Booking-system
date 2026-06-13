import * as repo from "../repositories/serviceOfferingRepository.js";
import { AppError, assertFound } from "../errors/AppError.js";

export async function listServiceOfferings() {
  return repo.listServiceOfferings();
}

/** @param {Record<string, unknown>} body */
export async function createServiceOffering(body) {
  return repo.insertServiceOffering(body);
}

/** @param {number} id @param {Record<string, unknown>} patch */
export async function updateServiceOffering(id, patch) {
  if (Object.keys(patch).length === 0) {
    throw new AppError("No fields to update", 400, "EMPTY_PATCH");
  }
  assertFound(await repo.findServiceOfferingById(id), "Service not found", "SERVICE_NOT_FOUND");
  return repo.updateServiceOffering(id, patch);
}

/** @param {number} id */
export async function deleteServiceOffering(id) {
  assertFound(await repo.findServiceOfferingById(id), "Service not found", "SERVICE_NOT_FOUND");
  await repo.deleteServiceOfferingSoft(id);
}
