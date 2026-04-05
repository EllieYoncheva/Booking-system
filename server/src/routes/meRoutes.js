import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validateQuery } from "../middleware/validate.js";
import { listReservationsQuerySchema } from "../schemas/bookingSchemas.js";
import * as reservationService from "../services/reservationService.js";

const router = Router();

router.get(
  "/bookings",
  validateQuery(listReservationsQuerySchema),
  asyncHandler(async (req, res) => {
    const rows = await reservationService.listReservations(
      { appUserId: req.appUser.id, isAdmin: false },
      req.query
    );
    res.json({ data: rows });
  })
);

export default router;
