import * as reservationRepository from "../repositories/reservationRepository.js";
import { getPool } from "../db/pool.js";
import { AppError, assertFound } from "../errors/AppError.js";
import * as bookingNotificationService from "./bookingNotificationService.js";
import { canClientCancelBeforeClass } from "../utils/cancellationPolicy.js";
import { USER_BOOKING_BLOCKED_MESSAGE } from "../utils/noShowPolicy.js";
import * as noShowBlockingService from "./noShowBlockingService.js";

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
  const r = await reservationRepository.bookClassSpot(input.appUserId, input.classId);
  if (!r.ok) {
    const map = {
      CLASS_NOT_FOUND: ["Class not found", 404, "CLASS_NOT_FOUND"],
      CLASS_CANCELLED: ["Class is cancelled", 409, "CLASS_CANCELLED"],
      CLASS_ALREADY_STARTED: ["Class has already started", 400, "CLASS_ALREADY_STARTED"],
      BOOKING_TOO_LATE: ["Booking window closed", 409, "BOOKING_TOO_LATE"],
      USER_BOOKING_BLOCKED: [USER_BOOKING_BLOCKED_MESSAGE, 403, "USER_BOOKING_BLOCKED"],
      ALREADY_BOOKED: ["You already have an active booking for this class", 409, "DUPLICATE_BOOKING"],
      ALREADY_ON_WAITLIST: ["You are already on the waitlist for this class", 409, "ALREADY_ON_WAITLIST"],
    };
    const m = map[r.code];
    if (m) throw new AppError(m[0], m[1], m[2]);
    if (r.code === "CLASS_HAS_SPOTS") {
      // defensive — book flow should not return this from join path
      throw new AppError("Class is full", 409, "CLASS_FULL");
    }
    throw new AppError("Booking not possible", 409, "BOOKING_FAILED");
  }
  const pool = getPool();
  if (pool) {
    await bookingNotificationService.notifyNewReservation(pool, {
      userId: input.appUserId,
      reservationId: r.reservationId,
      classId: input.classId,
      status: r.status,
    });
  }
  return reservationRepository.findReservationById(r.reservationId);
}

/**
 * @param {{ reservationId: number, actor: Actor, reason?: string|null }} input
 */
export async function cancelReservation(input) {
  const resv = await reservationRepository.findReservationById(input.reservationId);
  assertFound(resv, "Reservation not found", "RESERVATION_NOT_FOUND");

  if (!ACTIVE.includes(resv.status)) {
    throw new AppError("Reservation is not active", 400, "RESERVATION_NOT_ACTIVE");
  }

  if (!input.actor.isAdmin && Number(resv.userId) !== Number(input.actor.appUserId)) {
    throw new AppError("You cannot cancel this reservation", 403, "FORBIDDEN");
  }

  const wasAwaitingAdminDecision = resv.status === "pending";

  const raw = await reservationRepository.cancelActiveReservationWithPromotion(input.reservationId, {
    userId: input.actor.isAdmin ? null : input.actor.appUserId,
    asAdmin: input.actor.isAdmin,
    adminReason: input.reason,
  });

  if (!raw.ok) {
    if (raw.code === "FORBIDDEN") {
      throw new AppError("You cannot cancel this reservation", 403, "FORBIDDEN");
    }
    if (raw.code === "NOT_ACTIVE") {
      throw new AppError("Reservation is not active", 400, "RESERVATION_NOT_ACTIVE");
    }
    assertFound(null, "Reservation not found", "RESERVATION_NOT_FOUND");
  }

  const pool = getPool();
  if (pool) {
    await bookingNotificationService.afterSeatFreed(pool, {
      promoted: raw.promoted,
      adminRejectedPendingConfirmation: Boolean(input.actor.isAdmin && wasAwaitingAdminDecision),
      cancelledUserId: raw.cancelledUserId,
      reservationId: input.reservationId,
      classId: resv.classId,
    });
  }

  return reservationRepository.findReservationById(input.reservationId);
}

/**
 * Admin-only: set operational status (does not set cancel timestamps unless you pass cancelledAt).
 * @param {{ reservationId: number, status: 'pending'|'confirmed'|'no_show' }} input
 */
export async function patchReservationStatusAdmin(input) {
  const resv = await reservationRepository.findReservationById(input.reservationId);
  assertFound(resv, "Reservation not found", "RESERVATION_NOT_FOUND");
  const row = await reservationRepository.updateReservationStatus(resv.id, input.status, resv.cancelledAt, {});
  if (input.status === "no_show") {
    await noShowBlockingService.syncAutoBlockForUser(Number(resv.userId));
  }
  return row;
}

/**
 * @param {number} reservationId
 */
export async function confirmReservationAdmin(reservationId) {
  const resv = await reservationRepository.findReservationById(reservationId);
  assertFound(resv, "Reservation not found", "RESERVATION_NOT_FOUND");
  if (resv.status !== "pending") {
    throw new AppError("This reservation cannot be confirmed", 400, "INVALID_STATUS");
  }
  const row = await reservationRepository.updateReservationStatus(reservationId, "confirmed", null, {
    adminCancelReason: null,
  });
  const pool = getPool();
  if (pool) {
    await bookingNotificationService.notifyUserReservationConfirmed(
      pool,
      resv.userId,
      reservationId,
      resv.classId
    );
  }
  return row;
}

/**
 * Client cancels their reservation (frees slot + waitlist promotion + notifications).
 * @param {{ reservationId: number, appUserId: number, cancelReason?: string|null }} input
 * @returns {Promise<{ ok: true } | { ok: false, code: string }>}
 */
export async function cancelReservationForClient(input) {
  const resv = await reservationRepository.findReservationById(input.reservationId);
  if (!resv) return { ok: false, code: "NOT_FOUND" };
  if (!ACTIVE.includes(resv.status) || Number(resv.userId) !== Number(input.appUserId)) {
    return { ok: false, code: "NOT_FOUND" };
  }
  if (!canClientCancelBeforeClass(resv.classStartsAt)) {
    return { ok: false, code: "CANCEL_TOO_LATE" };
  }
  const raw = await reservationRepository.cancelActiveReservationWithPromotion(input.reservationId, {
    userId: input.appUserId,
    asAdmin: false,
    cancelReason: input.cancelReason,
  });
  if (!raw.ok) return { ok: false, code: "NOT_FOUND" };
  const pool = getPool();
  if (pool) {
    await bookingNotificationService.afterSeatFreed(pool, {
      promoted: raw.promoted,
      adminRejectedPendingConfirmation: false,
      cancelledUserId: raw.cancelledUserId,
      reservationId: input.reservationId,
      classId: resv.classId,
    });
  }
  return { ok: true };
}
