import * as reservationRepository from "../repositories/reservationRepository.js";
import * as classRepository from "../repositories/classRepository.js";
import { AppError, assertFound } from "../errors/AppError.js";
import { isDuplicateKeyError } from "../utils/mysqlErrors.js";

const ACTIVE = ["pending", "confirmed"];

/**
 * @typedef {{ appUserId: number, isAdmin: boolean }} Actor
 */

/**
 * @param {Actor} actor
 * @param {{ userId?: number, classId?: number, status?: string, limit?: number, offset?: number }} filters
 */
export async function listReservations(actor, filters) {
  if (actor.isAdmin) return reservationRepository.listReservationsAdmin(filters);
  return reservationRepository.listReservationsForUser(actor.appUserId, {
    classId: filters.classId,
    status: filters.status,
    limit: filters.limit,
    offset: filters.offset,
  });
}

/**
 * @param {{ appUserId: number, classId: number }} input
 */
export async function createReservation(input) {
  const cls = await classRepository.findClassById(input.classId);
  assertFound(cls, "Class not found", "CLASS_NOT_FOUND");

  const now = new Date();
  if (new Date(cls.startsAt) <= now) {
    throw new AppError("Class has already started", 400, "CLASS_ALREADY_STARTED");
  }

  const taken = await classRepository.countActiveReservationsForClass(input.classId);
  if (taken >= cls.capacity) {
    throw new AppError("Class is full", 409, "CLASS_FULL");
  }

  try {
    return await reservationRepository.insertReservation({
      userId: input.appUserId,
      classId: input.classId,
      status: "pending",
    });
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      throw new AppError("You already have an active booking for this class", 409, "DUPLICATE_BOOKING");
    }
    throw err;
  }
}

/**
 * @param {{ reservationId: number, actor: Actor }} input
 */
export async function cancelReservation(input) {
  const resv = await reservationRepository.findReservationById(input.reservationId);
  assertFound(resv, "Reservation not found", "RESERVATION_NOT_FOUND");

  if (!ACTIVE.includes(resv.status)) {
    throw new AppError("Reservation is not active", 400, "RESERVATION_NOT_ACTIVE");
  }

  if (!input.actor.isAdmin && resv.userId !== input.actor.appUserId) {
    throw new AppError("You cannot cancel this reservation", 403, "FORBIDDEN");
  }

  const status = input.actor.isAdmin ? "cancelled_by_admin" : "cancelled_by_user";
  return reservationRepository.updateReservationStatus(resv.id, status, new Date());
}

/**
 * Admin-only: set operational status (does not set cancel timestamps).
 * @param {{ reservationId: number, status: 'pending'|'confirmed'|'no_show' }} input
 */
export async function patchReservationStatusAdmin(input) {
  const resv = await reservationRepository.findReservationById(input.reservationId);
  assertFound(resv, "Reservation not found", "RESERVATION_NOT_FOUND");
  return reservationRepository.updateReservationStatus(resv.id, input.status, resv.cancelledAt);
}
