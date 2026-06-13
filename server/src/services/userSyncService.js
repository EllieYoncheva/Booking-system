import * as userService from "./userService.js";

/**
 * Resolve or create the app `Users` row for the Keycloak subject (JWT).
 * @param {{ sub: string, email?: string, preferredUsername?: string, givenName?: string, familyName?: string, roles?: string[] }} kcUser
 */
export async function ensureAppUser(kcUser) {
  return userService.findOrCreateFromKeycloakUser(kcUser);
}
