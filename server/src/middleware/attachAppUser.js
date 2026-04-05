import { getPool } from "../db/pool.js";
import { ensureAppUser } from "../services/userSyncService.js";

export function attachAppUser() {
  return async (req, res, next) => {
    try {
      if (!getPool()) {
        return res.status(503).json({ error: "Database not configured" });
      }
      const appUser = await ensureAppUser(req.user);
      if (!appUser) {
        return res.status(503).json({ error: "Database not available" });
      }
      req.appUser = appUser;
      next();
    } catch (err) {
      next(err);
    }
  };
}
