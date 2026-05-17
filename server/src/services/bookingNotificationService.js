import * as notificationRepository from "../repositories/notificationRepository.js";

/**
 * @param {import("mysql2/promise").PoolConnection|import("mysql2/promise").Pool} executor
 * @param {number} userId
 * @param {number} reservationId
 * @param {number} classId
 */
export async function notifyWaitlistPromotedToPending(executor, userId, reservationId, classId) {
  await notificationRepository.insertNotificationSafe(executor, {
    userId,
    type: "waitlist_promoted",
    reservationId,
    classId,
  });
}

/**
 * @param {import("mysql2/promise").PoolConnection|import("mysql2/promise").Pool} executor
 * @param {number} reservationId
 * @param {number} classId
 */
export async function notifyAdminsPendingConfirmation(executor, reservationId, classId) {
  const adminIds = await notificationRepository.listAdminUserIds();
  for (const adminId of adminIds) {
    await notificationRepository.insertNotificationSafe(executor, {
      userId: adminId,
      type: "admin_pending_action",
      reservationId,
      classId,
    });
  }
}

/**
 * @param {import("mysql2/promise").PoolConnection|import("mysql2/promise").Pool} executor
 * @param {number} userId
 * @param {number} reservationId
 * @param {number} classId
 */
export async function notifyUserReservationConfirmed(executor, userId, reservationId, classId) {
  await notificationRepository.insertNotificationSafe(executor, {
    userId,
    type: "confirmed",
    reservationId,
    classId,
  });
}

/**
 * @param {import("mysql2/promise").PoolConnection|import("mysql2/promise").Pool} executor
 * @param {number} userId
 * @param {number|null} reservationId
 * @param {number} classId
 */
export async function notifyUserReservationRejected(executor, userId, reservationId, classId) {
  await notificationRepository.insertNotificationSafe(executor, {
    userId,
    type: "reservation_rejected",
    reservationId,
    classId,
  });
}

/**
 * @param {import("mysql2/promise").PoolConnection|import("mysql2/promise").Pool} executor
 * @param {{ userId: number, reservationId: number, classId: number, status: 'pending'|'confirmed' }} row
 */
export async function notifyNewReservation(executor, row) {
  if (row.status === "confirmed") {
    await notifyUserReservationConfirmed(executor, row.userId, row.reservationId, row.classId);
    return;
  }
  await notifyAdminsPendingConfirmation(executor, row.reservationId, row.classId);
}

/**
 * @param {import("mysql2/promise").Pool} executor
 * @param {Array<{ reservationId: number; userId: number; classId: number; status?: 'pending'|'confirmed' }>} promoted
 */
export async function notifyPromotedFromWaitlist(executor, promoted) {
  for (const p of promoted) {
    await notifyWaitlistPromotedToPending(executor, p.userId, p.reservationId, p.classId);
    const status = p.status ?? "pending";
    if (status === "confirmed") {
      await notifyUserReservationConfirmed(executor, p.userId, p.reservationId, p.classId);
    } else {
      await notifyAdminsPendingConfirmation(executor, p.reservationId, p.classId);
    }
  }
}

/**
 * @param {import("mysql2/promise").Pool} pool
 * @param {{ promoted: Array<{ reservationId: number; userId: number; classId: number }>; adminRejectedPendingConfirmation: boolean; cancelledUserId: number; reservationId: number; classId: number }} input
 */
export async function afterSeatFreed(pool, input) {
  try {
    await notifyPromotedFromWaitlist(pool, input.promoted);
    if (input.adminRejectedPendingConfirmation) {
      await notifyUserReservationRejected(pool, input.cancelledUserId, input.reservationId, input.classId);
    }
  } catch (e) {
    console.error("[notifications] afterSeatFreed failed", e);
  }
}
