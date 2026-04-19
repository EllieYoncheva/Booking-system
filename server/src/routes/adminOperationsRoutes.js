import { Router } from "express";
import { verifyKeycloakJwt, requireRole } from "../middleware/keycloakJwt.js";
import { attachAppUser } from "../middleware/attachAppUser.js";
import * as userService from "../services/userService.js";
import * as reservationService from "../services/reservationService.js";
import * as reservationRepository from "../repositories/reservationRepository.js";
import * as appSettingsService from "../services/appSettingsService.js";

const router = Router();

router.use(verifyKeycloakJwt(true));
router.use(requireRole("admin"));
router.use(attachAppUser());

function parseLimitOffset(q) {
  const limit = Math.min(Math.max(Number(q.limit) || 50, 1), 100);
  const offset = Math.max(Number(q.offset) || 0, 0);
  return { limit, offset };
}

router.get("/clients", async (req, res, next) => {
  try {
    const { limit, offset } = parseLimitOffset(req.query);
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const rows = await userService.listClientsForAdmin({ limit, offset, search });
    res.json({ clients: rows });
  } catch (e) {
    next(e);
  }
});

router.get("/clients/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: "Invalid id" });
    const client = await userService.getClientForAdmin(id);
    res.json({ client });
  } catch (e) {
    if (e && e.code === "USER_NOT_FOUND") return res.status(404).json({ error: e.message });
    next(e);
  }
});

router.patch("/clients/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: "Invalid id" });
    const row = await userService.updateClientForAdmin(id, req.body ?? {});
    res.json({ client: row });
  } catch (e) {
    if (e && (e.code === "USER_NOT_FOUND" || e.code === "VALIDATION")) {
      return res.status(e.code === "USER_NOT_FOUND" ? 404 : 400).json({ error: e.message });
    }
    if (e && e.code === "EMAIL_IN_USE") return res.status(409).json({ error: e.message });
    next(e);
  }
});

router.get("/clients/:id/reservations", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: "Invalid id" });
    await userService.getClientForAdmin(id);
    const { limit, offset } = parseLimitOffset(req.query);
    const rows = await reservationRepository.listReservationsAdmin({ userId: id, limit, offset });
    res.json({ reservations: rows });
  } catch (e) {
    if (e && e.code === "USER_NOT_FOUND") return res.status(404).json({ error: e.message });
    next(e);
  }
});

const RES_STATUSES = new Set([
  "pending",
  "confirmed",
  "cancelled_by_user",
  "cancelled_by_admin",
  "no_show",
]);

router.get("/reservations", async (req, res, next) => {
  try {
    const { limit, offset } = parseLimitOffset(req.query);
    const userId = req.query.userId != null ? Number(req.query.userId) : undefined;
    const classId = req.query.classId != null ? Number(req.query.classId) : undefined;
    const status =
      typeof req.query.status === "string" && RES_STATUSES.has(req.query.status)
        ? req.query.status
        : undefined;
    if (userId !== undefined && (!Number.isInteger(userId) || userId < 1)) {
      return res.status(400).json({ error: "Invalid userId" });
    }
    if (classId !== undefined && (!Number.isInteger(classId) || classId < 1)) {
      return res.status(400).json({ error: "Invalid classId" });
    }
    const rows = await reservationService.listReservations(
      { appUserId: req.appUser.id, isAdmin: true },
      { userId, classId, status, limit, offset }
    );
    res.json({ reservations: rows });
  } catch (e) {
    next(e);
  }
});

router.post("/reservations/:id/confirm", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: "Invalid id" });
    const row = await reservationService.confirmReservationAdmin(id);
    res.json({ reservation: row });
  } catch (e) {
    if (e && e.code === "RESERVATION_NOT_FOUND") return res.status(404).json({ error: e.message });
    if (e && e.code === "INVALID_STATUS") return res.status(400).json({ error: e.message });
    next(e);
  }
});

router.post("/reservations/:id/cancel", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: "Invalid id" });
    const reason =
      req.body && typeof req.body.reason === "string" ? req.body.reason : null;
    const row = await reservationService.cancelReservation({
      reservationId: id,
      actor: { appUserId: req.appUser.id, isAdmin: true },
      reason,
    });
    res.json({ reservation: row });
  } catch (e) {
    if (e && e.code === "RESERVATION_NOT_FOUND") return res.status(404).json({ error: e.message });
    if (e && e.code === "RESERVATION_NOT_ACTIVE") return res.status(400).json({ error: e.message });
    next(e);
  }
});

router.get("/settings/booking", async (_req, res, next) => {
  try {
    const settings = await appSettingsService.getBookingSettings();
    res.json(settings);
  } catch (e) {
    next(e);
  }
});

router.patch("/settings/booking", async (req, res, next) => {
  try {
    const v = req.body?.autoConfirmBookings;
    if (typeof v !== "boolean") {
      return res.status(400).json({ error: "autoConfirmBookings (boolean) is required" });
    }
    const settings = await appSettingsService.setAutoConfirmBookings(v);
    res.json(settings);
  } catch (e) {
    next(e);
  }
});

export default router;
