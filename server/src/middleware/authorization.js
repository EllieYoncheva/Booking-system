import { verifyKeycloakJwt } from "./keycloakJwt.js";

/** Require a valid Bearer JWT (alias for clarity in route modules). */
export const requireAuth = verifyKeycloakJwt(true);
