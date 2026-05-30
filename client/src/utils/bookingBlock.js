export const ONLINE_BOOKING_BLOCKED_MESSAGE =
  "Профилът е блокиран поради неявявания. Свържете се с администраторът.";

/** @param {Record<string, unknown>|null|undefined} appUser */
export function isOnlineBookingBlocked(appUser) {
  return Boolean(appUser?.onlineBookingBlocked);
}

