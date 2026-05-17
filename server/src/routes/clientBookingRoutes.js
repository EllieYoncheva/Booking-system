import { Router } from "express";
import { verifyKeycloakJwt } from "../middleware/keycloakJwt.js";
import { attachAppUser } from "../middleware/attachAppUser.js";
import * as classRepository from "../repositories/classRepository.js";
import * as reservationRepository from "../repositories/reservationRepository.js";
import * as waitlistRepository from "../repositories/waitlistRepository.js";
import * as reservationService from "../services/reservationService.js";
import { getPool } from "../db/pool.js";
import * as bookingNotificationService from "../services/bookingNotificationService.js";

const router = Router();

router.get("/classes", async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const range = {};
    if (typeof from === "string" && from.trim()) range.from = from.trim();
    if (typeof to === "string" && to.trim()) range.to = to.trim();
    const rows = await classRepository.listPublicClassesWithSpots(range);
    res.json({ classes: rows });
  } catch (err) {
    next(err);
  }
});

router.use(verifyKeycloakJwt(true));
router.use(attachAppUser());

router.get("/me/reservations", async (req, res, next) => {
  try {
    const rows = await reservationRepository.listReservationsByUserId(req.appUser.id);
    res.json({ reservations: rows });
  } catch (err) {
    next(err);
  }
});

router.post("/classes/:classId/reservations", async (req, res, next) => {
  try {
    const classId = Number(req.params.classId);
    if (!Number.isInteger(classId) || classId < 1) {
      return res.status(400).json({ error: "Invalid class id" });
    }
    const result = await reservationRepository.bookClassSpot(req.appUser.id, classId);
    if (!result.ok) {
      const map = {
        CLASS_NOT_FOUND: { status: 404, error: "Класът не е намерен" },
        CLASS_CANCELLED: { status: 409, error: "Класът е отменен" },
        CLASS_ALREADY_STARTED: { status: 409, error: "Класът вече е започнал" },
        CLASS_FULL: { status: 409, error: "Няма свободни места" },
        ALREADY_BOOKED: { status: 409, error: "Вече имате резервация за този клас" },
      };
      const m = map[result.code] ?? { status: 409, error: "Резервацията не е възможна" };
      return res.status(m.status).json({ error: m.error, code: result.code });
    }
    const pool = getPool();
    if (pool) {
      await bookingNotificationService.notifyNewReservation(pool, {
        userId: req.appUser.id,
        reservationId: result.reservationId,
        classId,
        status: result.status,
      });
    }
    res.status(201).json({ reservationId: result.reservationId, status: result.status });
  } catch (err) {
    next(err);
  }
});

router.post("/classes/:classId/waitlist", async (req, res, next) => {
  try {
    const classId = Number(req.params.classId);
    if (!Number.isInteger(classId) || classId < 1) {
      return res.status(400).json({ error: "Invalid class id" });
    }
    const result = await waitlistRepository.tryJoinWaitlist(req.appUser.id, classId);
    if (!result.ok) {
      const map = {
        CLASS_NOT_FOUND: { status: 404, error: "Класът не е намерен" },
        CLASS_CANCELLED: { status: 409, error: "Класът е отменен" },
        CLASS_ALREADY_STARTED: { status: 409, error: "Класът вече е започнал" },
        CLASS_HAS_SPOTS: { status: 409, error: "Има свободни места — използвайте „Запази“" },
        ALREADY_BOOKED: { status: 409, error: "Вече имате резервация за този клас" },
        ALREADY_ON_WAITLIST: { status: 409, error: "Вече сте в списъка за чакане за този клас" },
      };
      const m = map[result.code] ?? { status: 409, error: "Записът в списъка не е възможен" };
      return res.status(m.status).json({ error: m.error, code: result.code });
    }
    res.status(201).json({
      waitlistId: result.waitlistId,
      position: result.position,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/me/waitlist", async (req, res, next) => {
  try {
    const rows = await waitlistRepository.listWaitlistByUserId(req.appUser.id);
    res.json({ waitlist: rows });
  } catch (err) {
    next(err);
  }
});

router.delete("/me/waitlist/:classId", async (req, res, next) => {
  try {
    const classId = Number(req.params.classId);
    if (!Number.isInteger(classId) || classId < 1) {
      return res.status(400).json({ error: "Invalid class id" });
    }
    const ok = await waitlistRepository.leaveWaitlist(req.appUser.id, classId);
    if (!ok) {
      return res.status(404).json({ error: "Няма активен запис в списъка за чакане" });
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.patch("/reservations/:id/cancel", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: "Invalid reservation id" });
    }
    const ok = await reservationService.cancelReservationForClient({
      reservationId: id,
      appUserId: req.appUser.id,
    });
    if (!ok) {
      return res.status(404).json({ error: "Резервацията не е намерена или вече е анулирана" });
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
