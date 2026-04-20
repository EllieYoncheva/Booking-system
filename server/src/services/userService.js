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

  let user = await userRepository.findUserByKeycloakSub(kc.sub);
  if (user) {
    const patch = {};
    if (user.role !== dbRole) patch.role = dbRole;
    if (user.email !== email) patch.email = email;
    // Names are editable in-app; do not overwrite on each login once the row exists.
    if (Object.keys(patch).length) user = await userRepository.updateUser(user.id, patch);
    return user;
  }

  const { firstName, lastName } = deriveNames(kc);

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

/**
 * @param {{ limit?: number, offset?: number, search?: string }} opts
 */
export async function listClientsForAdmin(opts) {
  return userRepository.listUsersByRole("client", opts);
}

/**
 * @param {number} id
 */
export async function getClientForAdmin(id) {
  const user = await userRepository.findUserById(id);
  if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
  if (user.role !== "client") {
    throw new AppError("Not a client record", 404, "USER_NOT_FOUND");
  }
  return user;
}

/**
 * @param {number} id
 * @param {Record<string, unknown>} body
 */
/**
 * Update the authenticated user's own profile (names and phone in `Users`).
 * @param {{ sub: string }} kc
 * @param {Record<string, unknown>} body
 */
export async function updateMyProfile(kc, body) {
  if (!kc?.sub) throw new AppError("Not authenticated", 401, "UNAUTHORIZED");
  const user = await findOrCreateFromKeycloakUser(kc);
  const patch = {};
  if (body.firstName !== undefined) {
    const v = String(body.firstName).trim().slice(0, 100);
    if (!v) throw new AppError("firstName is required when provided", 400, "VALIDATION");
    patch.firstName = v;
  }
  if (body.lastName !== undefined) {
    const v = String(body.lastName).trim().slice(0, 100);
    if (!v) throw new AppError("lastName is required when provided", 400, "VALIDATION");
    patch.lastName = v;
  }
  if (body.phone !== undefined) {
    patch.phone =
      body.phone == null || String(body.phone).trim() === ""
        ? null
        : String(body.phone).trim().slice(0, 32);
  }
  if (Object.keys(patch).length === 0) {
    throw new AppError("No fields to update", 400, "EMPTY_PATCH");
  }
  return userRepository.updateUser(user.id, patch);
}

export async function updateClientForAdmin(id, body) {
  await getClientForAdmin(id);
  const patch = {};
  if (body.firstName !== undefined) {
    const v = String(body.firstName).trim().slice(0, 100);
    if (!v) throw new AppError("firstName is required when provided", 400, "VALIDATION");
    patch.firstName = v;
  }
  if (body.lastName !== undefined) {
    const v = String(body.lastName).trim().slice(0, 100);
    if (!v) throw new AppError("lastName is required when provided", 400, "VALIDATION");
    patch.lastName = v;
  }
  if (body.email !== undefined) {
    const email = String(body.email).trim().slice(0, 255);
    if (!email) throw new AppError("email is required when provided", 400, "VALIDATION");
    const existing = await userRepository.findUserByEmail(email);
    if (existing && existing.id !== id) {
      throw new AppError("Email already in use", 409, "EMAIL_IN_USE");
    }
    patch.email = email;
  }
  if (body.phone !== undefined) {
    patch.phone =
      body.phone == null || String(body.phone).trim() === ""
        ? null
        : String(body.phone).trim().slice(0, 32);
  }
  if (body.notes !== undefined) {
    patch.notes = body.notes == null ? null : String(body.notes).slice(0, 65535);
  }
  if (body.internalNotes !== undefined) {
    patch.internalNotes = body.internalNotes == null ? null : String(body.internalNotes).slice(0, 65535);
  }
  if (Object.keys(patch).length === 0) {
    return userRepository.findUserById(id);
  }
  return userRepository.updateUser(id, patch);
}
