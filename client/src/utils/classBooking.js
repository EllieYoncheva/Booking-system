import { apiRequest } from "../api/http.js";

/**
 * @param {() => Promise<string | undefined>} getToken
 * @param {number|string} classId
 */
export function reserveClass(getToken, classId) {
  return apiRequest(getToken, `/api/classes/${classId}/reservations`, { method: "POST" });
}

/**
 * @param {() => Promise<string | undefined>} getToken
 * @param {number|string} classId
 */
export function joinClassWaitlist(getToken, classId) {
  return apiRequest(getToken, `/api/classes/${classId}/waitlist`, { method: "POST" });
}

/**
 * @param {() => Promise<string | undefined>} getToken
 * @param {number|string} reservationId
 */
export function cancelReservation(getToken, reservationId) {
  return apiRequest(getToken, `/api/reservations/${reservationId}/cancel`, {
    method: "PATCH",
  });
}
