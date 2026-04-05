import * as userRepository from "../repositories/userRepository.js";
import { AppError } from "../errors/AppError.js";

/**
 * @param {{ sub: string, email?: string, preferredUsername?: string, givenName?: string, familyName?: string, roles?: string[] }} kc
 */
function deriveDbRole(kc) {
  return kc.roles?.includes("admin") ? "admin" : "client";
}

/**
 * @param {{ givenName?: string, familyName?: string, preferredUsername?: string }} kc
 */
function deriveNames(kc) {
  const first =
    (typeof kc.givenName === "string" && kc.givenName.trim()) ||
    (kc.preferredUsername ? String(kc.preferredUsername).split("@")[0] : "") ||
    "User";
  const last =
    (typeof kc.familyName === "string" && kc.familyName.trim()) || "—";
  return { firstName: first.slice(0, 100), lastName: last.slice(0, 100) };
}

/**
 * @param {{ email?: string, preferredUsername?: string }} kc
 */
function deriveEmail(kc) {
  if (kc.email && String(kc.email).trim()) return String(kc.email).trim().slice(0, 255);
  if (kc.preferredUsername)
    return `${String(kc.preferredUsername).slice(0, 200)}@users.booking.local`;
  throw new AppError("Token is missing email and username", 400, "INVALID_TOKEN_SUBJECT");
}

/**
 * Resolve or create the app `Users` row for this Keycloak subject.
 * @param {{ sub: string, email?: string, preferredUsername?: string, givenName?: string, familyName?: string, roles?: string[] }} kc
 */
export async function findOrCreateFromKeycloakUser(kc) {
  if (!kc?.sub) throw new AppError("Not authenticated", 401, "UNAUTHORIZED");

  const dbRole = deriveDbRole(kc);
  const email = deriveEmail(kc);
  const { firstName, lastName } = deriveNames(kc);

  let user = await userRepository.findUserByKeycloakSub(kc.sub);
  if (user) {
    const patch = {};
    if (user.role !== dbRole) patch.role = dbRole;
    if (user.email !== email) patch.email = email;
    if (user.firstName !== firstName) patch.firstName = firstName;
    if (user.lastName !== lastName) patch.lastName = lastName;
    if (Object.keys(patch).length) user = await userRepository.updateUser(user.id, patch);
    return user;
  }

  const byEmail = await userRepository.findUserByEmail(email);
  if (byEmail) {
    const linked = await userRepository.updateUser(byEmail.id, {
      keycloakSub: kc.sub,
      role: dbRole,
      firstName,
      lastName,
    });
    return linked;
  }

  return userRepository.insertUser({
    firstName,
    lastName,
    email,
    phone: null,
    keycloakSub: kc.sub,
    passwordHash: null,
    role: dbRole,
  });
}

/**
 * @param {{ limit?: number, offset?: number }} opts
 */
export async function listUsers(opts) {
  return userRepository.listUsers(opts);
}
