import * as classRepository from "../repositories/classRepository.js";
import * as serviceOfferingRepository from "../repositories/serviceOfferingRepository.js";
import * as studioRepository from "../repositories/studioRepository.js";
import * as instructorRepository from "../repositories/instructorRepository.js";
import { AppError, assertFound } from "../errors/AppError.js";

/**
 * @param {{ from?: Date, to?: Date }} range
 * @param {{ defaultFromNow?: boolean }} [opts]
 */
export async function listClasses(range, opts = {}) {
  const defaultFromNow = opts.defaultFromNow !== false;
  const from = range.from ?? (defaultFromNow ? new Date() : undefined);
  return classRepository.listClasses({ from, to: range.to });
}

/**
 * @param {Omit<import("../entities/types.js").ScheduledClass, "id"|"cancellationReason"> & { cancellationReason?: string | null }} body
 */
export async function createClass(body) {
  await assertFkTargets(body);
  if (body.endsAt <= body.startsAt) {
    throw new AppError("endsAt must be after startsAt", 400, "INVALID_CLASS_TIME");
  }
  return classRepository.insertClass({
    name: body.name ?? null,
    description: body.description ?? null,
    startsAt: body.startsAt,
    endsAt: body.endsAt,
    price: body.price ?? null,
    capacity: body.capacity,
    serviceId: body.serviceId,
    studioId: body.studioId,
    instructorId: body.instructorId,
    cancellationReason: body.cancellationReason ?? null,
  });
}

/**
 * @param {number} id
 * @param {Partial<import("../entities/types.js").ScheduledClass>} patch
 */
export async function updateClass(id, patch) {
  if (Object.keys(patch).length === 0) {
    throw new AppError("No fields to update", 400, "EMPTY_PATCH");
  }
  const existing = await classRepository.findClassById(id);
  assertFound(existing, "Class not found", "CLASS_NOT_FOUND");

  const next = {
    name: patch.name !== undefined ? patch.name : existing.name,
    description: patch.description !== undefined ? patch.description : existing.description,
    startsAt: patch.startsAt !== undefined ? patch.startsAt : existing.startsAt,
    endsAt: patch.endsAt !== undefined ? patch.endsAt : existing.endsAt,
    price: patch.price !== undefined ? patch.price : existing.price,
    capacity: patch.capacity !== undefined ? patch.capacity : existing.capacity,
    serviceId: patch.serviceId !== undefined ? patch.serviceId : existing.serviceId,
    studioId: patch.studioId !== undefined ? patch.studioId : existing.studioId,
    instructorId: patch.instructorId !== undefined ? patch.instructorId : existing.instructorId,
    cancellationReason:
      patch.cancellationReason !== undefined ? patch.cancellationReason : existing.cancellationReason,
  };

  const body = {
    serviceId: next.serviceId,
    studioId: next.studioId,
    instructorId: next.instructorId,
    startsAt: next.startsAt,
    endsAt: next.endsAt,
    capacity: next.capacity,
  };
  await assertFkTargets(body);

  if (new Date(next.endsAt) <= new Date(next.startsAt)) {
    throw new AppError("endsAt must be after startsAt", 400, "INVALID_CLASS_TIME");
  }

  return classRepository.updateClass(id, {
    name: next.name,
    description: next.description,
    startsAt: next.startsAt,
    endsAt: next.endsAt,
    price: next.price,
    capacity: next.capacity,
    serviceId: next.serviceId,
    studioId: next.studioId,
    instructorId: next.instructorId,
    cancellationReason: next.cancellationReason,
  });
}

/** @param {number} id */
export async function deleteClass(id) {
  const existing = await classRepository.findClassById(id);
  assertFound(existing, "Class not found", "CLASS_NOT_FOUND");
  const n = await classRepository.countAnyReservationsForClass(id);
  if (n > 0) {
    throw new AppError("Cannot delete class with existing reservations", 409, "CLASS_HAS_RESERVATIONS");
  }
  await classRepository.deleteClass(id);
}

/** @param {{ serviceId: number, studioId: number, instructorId: number }} body */
async function assertFkTargets(body) {
  assertFound(
    await serviceOfferingRepository.findServiceOfferingById(body.serviceId),
    "Service not found",
    "SERVICE_NOT_FOUND"
  );
  assertFound(
    await studioRepository.findStudioById(body.studioId),
    "Studio not found",
    "STUDIO_NOT_FOUND"
  );
  assertFound(
    await instructorRepository.findInstructorById(body.instructorId),
    "Instructor not found",
    "INSTRUCTOR_NOT_FOUND"
  );
}
