import * as appSettingsRepository from "../repositories/appSettingsRepository.js";

const AUTO_CONFIRM_KEY = "booking.autoConfirm";

export async function getAutoConfirmBookings() {
  return appSettingsRepository.getBooleanSetting(AUTO_CONFIRM_KEY, false);
}

/**
 * @param {boolean} enabled
 */
export async function setAutoConfirmBookings(enabled) {
  await appSettingsRepository.upsertSetting(AUTO_CONFIRM_KEY, enabled ? "true" : "false");
  return { autoConfirmBookings: enabled };
}

export async function getBookingSettings() {
  return { autoConfirmBookings: await getAutoConfirmBookings() };
}
