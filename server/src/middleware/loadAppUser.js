import * as userService from "../services/userService.js";
import { asyncHandler } from "./asyncHandler.js";

/** After `verifyKeycloakJwt`, resolves `req.appUser` from the `Users` table. */
export function loadAppUser() {
  return asyncHandler(async (req, _res, next) => {
    req.appUser = await userService.findOrCreateFromKeycloakUser(req.user);
    next();
  });
}
