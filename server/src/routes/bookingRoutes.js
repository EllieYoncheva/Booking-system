import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validateBody, validateParams } from "../middleware/validate.js";
import { createBookingBodySchema, reservationIdParamSchema } from "../schemas/bookingSchemas.js";
import * as reservationService from "../services/reservationService.js";

const router = Router();

router.post(
  "/bookings",
  validateBody(createBookingBodySchema),
  asyncHandler(async (req, res) => {
    const row = await reservationService.createReservation({
      appUserId: req.appUser.id,
      classId: req.body.classId,
    });
    res.status(201).json({ data: row });
  })
);

router.post(
  "/bookings/:id/cancel",
  validateParams(reservationIdParamSchema),
  asyncHandler(async (req, res) => {
    const row = await reservationService.cancelReservation({
      reservationId: req.params.id,
      actor: { appUserId: req.appUser.id, isAdmin: false },
    });
    res.json({ data: row });
  })
);

export default router;
