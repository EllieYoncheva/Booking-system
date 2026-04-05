import { Router } from "express";
import { verifyKeycloakJwt } from "../middleware/keycloakJwt.js";
import { attachAppUser } from "../middleware/attachAppUser.js";
import * as classRepository from "../repositories/classRepository.js";
import * as reservationRepository from "../repositories/reservationRepository.js";

const router = Router();

router.use(verifyKeycloakJwt(true));
router.use(attachAppUser());

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
    const result = await reservationRepository.tryBookClass(req.appUser.id, classId);
    if (!result.ok) {
      const map = {
        CLASS_NOT_FOUND: { status: 404, error: "Класът не е намерен" },
        CLASS_CANCELLED: { status: 409, error: "Класът е отменен" },
        CLASS_FULL: { status: 409, error: "Няма свободни места" },
        ALREADY_BOOKED: { status: 409, error: "Вече имате резервация за този клас" },
      };
      const m = map[result.code] ?? { status: 409, error: "Резервацията не е възможна" };
      return res.status(m.status).json({ error: m.error, code: result.code });
    }
    res.status(201).json({ reservationId: result.reservationId });
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
    const ok = await reservationRepository.cancelReservationByUser(id, req.appUser.id);
    if (!ok) {
      return res.status(404).json({ error: "Резервацията не е намерена или вече е анулирана" });
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
