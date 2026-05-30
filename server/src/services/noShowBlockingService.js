import { getPool } from "../db/pool.js";
import * as userRepository from "../repositories/userRepository.js";
import { AppError } from "../errors/AppError.js";
import {
  NO_SHOW_BLOCK_THRESHOLD,
  USER_BOOKING_BLOCKED_MESSAGE,
} from "../utils/noShowPolicy.js";

/** @param {number} userId */
export async function countNoShows(userId) {
  const pool = getPool();
  if (!pool) return 0;
  const [rows] = await pool.query(
    "SELECT COUNT(*) AS cnt FROM `Reservations` WHERE `userId` = ? AND `status` = 'no_show'",
    [userId],
  );
  return Number(rows[0]?.cnt ?? 0);
}

/** @param {Record<string, unknown>|null|undefined} user */
export function assertUserCanBookOnline(user) {
  if (user?.onlineBookingBlocked) {
    throw new AppError(
      USER_BOOKING_BLOCKED_MESSAGE,
      403,
      "USER_BOOKING_BLOCKED",
    );
  }
}

/** @param {number} userId */
export async function isUserOnlineBookingBlocked(userId) {
  const user = await userRepository.findUserById(userId);
  return Boolean(user?.onlineBookingBlocked);
}

/**
 * @param {import("mysql2/promise").PoolConnection} conn
 * @param {number} userId
 */
export async function isUserOnlineBookingBlockedInTransaction(conn, userId) {
  const [rows] = await conn.query(
    "SELECT `onlineBookingBlocked` FROM `Users` WHERE `id` = ? AND `deletedAt` IS NULL LIMIT 1 FOR UPDATE",
    [userId],
  );
  return Boolean(rows[0]?.onlineBookingBlocked);
}

/**
 * @param {number} userId
 * @param {'auto_no_show'|'admin_manual'} source
 */
export async function blockClientOnlineBooking(userId, source) {
  const user = await userRepository.findUserById(userId);
  if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
  await userRepository.updateUser(userId, {
    onlineBookingBlocked: true,
    bookingBlockedAt: new Date(),
    bookingBlockedSource: source,
  });
  return enrichUserWithNoShowCount(await userRepository.findUserById(userId));
}

/** @param {number} userId */
export async function unblockClientOnlineBooking(userId) {
  const user = await userRepository.findUserById(userId);
  if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
  await userRepository.updateUser(userId, {
    onlineBookingBlocked: false,
    bookingBlockedAt: null,
    bookingBlockedSource: null,
  });
  return enrichUserWithNoShowCount(await userRepository.findUserById(userId));
}

/** @param {number} userId */
export async function syncAutoBlockForUser(userId) {
  const user = await userRepository.findUserById(userId);
  if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
  const noShowCount = await countNoShows(userId);
  if (noShowCount < NO_SHOW_BLOCK_THRESHOLD || user.onlineBookingBlocked) {
    return { user: { ...user, noShowCount }, noShowCount, blocked: false };
  }
  const blockedUser = await blockClientOnlineBooking(userId, "auto_no_show");
  return { user: blockedUser, noShowCount, blocked: true };
}

/** @param {Record<string, unknown>|null|undefined} user */
export async function enrichUserWithNoShowCount(user) {
  if (!user) return user;
  return {
    ...user,
    onlineBookingBlocked: Boolean(user.onlineBookingBlocked),
    noShowCount: await countNoShows(Number(user.id)),
  };
}

/** @param {Array<Record<string, unknown>>} users */
export async function enrichUsersWithNoShowCount(users) {
  return Promise.all(users.map((user) => enrichUserWithNoShowCount(user)));
}
