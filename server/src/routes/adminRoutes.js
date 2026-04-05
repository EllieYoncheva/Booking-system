import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validateBody, validateParams, validateQuery } from "../middleware/validate.js";
import { idParamSchema, paginationSchema } from "../schemas/common.js";
import {
  createClassBodySchema,
  updateClassBodySchema,
} from "../schemas/classSchemas.js";
import {
  listReservationsQuerySchema,
  patchReservationStatusBodySchema,
  reservationIdParamSchema,
} from "../schemas/bookingSchemas.js";
import {
  createInstructorBodySchema,
  createServiceOfferingBodySchema,
  createStudioBodySchema,
  updateInstructorBodySchema,
  updateServiceOfferingBodySchema,
  updateStudioBodySchema,
} from "../schemas/catalogSchemas.js";
import * as classService from "../services/classService.js";
import * as instructorService from "../services/instructorService.js";
import * as reservationService from "../services/reservationService.js";
import * as serviceOfferingService from "../services/serviceOfferingService.js";
import * as studioService from "../services/studioService.js";
import * as userService from "../services/userService.js";

const router = Router();

router.get(
  "/users",
  validateQuery(paginationSchema),
  asyncHandler(async (req, res) => {
    const rows = await userService.listUsers({
      limit: req.query.limit,
      offset: req.query.offset,
    });
    res.json({ data: rows });
  })
);

router.get(
  "/studios",
  asyncHandler(async (_req, res) => {
    res.json({ data: await studioService.listStudios() });
  })
);

router.post(
  "/studios",
  validateBody(createStudioBodySchema),
  asyncHandler(async (req, res) => {
    const row = await studioService.createStudio(req.body);
    res.status(201).json({ data: row });
  })
);

router.patch(
  "/studios/:id",
  validateParams(idParamSchema),
  validateBody(updateStudioBodySchema),
  asyncHandler(async (req, res) => {
    const row = await studioService.updateStudio(req.params.id, req.body);
    res.json({ data: row });
  })
);

router.delete(
  "/studios/:id",
  validateParams(idParamSchema),
  asyncHandler(async (req, res) => {
    await studioService.deleteStudio(req.params.id);
    res.status(204).send();
  })
);

router.get(
  "/services",
  asyncHandler(async (_req, res) => {
    res.json({ data: await serviceOfferingService.listServiceOfferings() });
  })
);

router.post(
  "/services",
  validateBody(createServiceOfferingBodySchema),
  asyncHandler(async (req, res) => {
    const row = await serviceOfferingService.createServiceOffering(req.body);
    res.status(201).json({ data: row });
  })
);

router.patch(
  "/services/:id",
  validateParams(idParamSchema),
  validateBody(updateServiceOfferingBodySchema),
  asyncHandler(async (req, res) => {
    const row = await serviceOfferingService.updateServiceOffering(req.params.id, req.body);
    res.json({ data: row });
  })
);

router.delete(
  "/services/:id",
  validateParams(idParamSchema),
  asyncHandler(async (req, res) => {
    await serviceOfferingService.deleteServiceOffering(req.params.id);
    res.status(204).send();
  })
);

router.get(
  "/instructors",
  asyncHandler(async (_req, res) => {
    res.json({ data: await instructorService.listInstructors() });
  })
);

router.post(
  "/instructors",
  validateBody(createInstructorBodySchema),
  asyncHandler(async (req, res) => {
    const row = await instructorService.createInstructor(req.body);
    res.status(201).json({ data: row });
  })
);

router.patch(
  "/instructors/:id",
  validateParams(idParamSchema),
  validateBody(updateInstructorBodySchema),
  asyncHandler(async (req, res) => {
    const row = await instructorService.updateInstructor(req.params.id, req.body);
    res.json({ data: row });
  })
);

router.delete(
  "/instructors/:id",
  validateParams(idParamSchema),
  asyncHandler(async (req, res) => {
    await instructorService.deleteInstructor(req.params.id);
    res.status(204).send();
  })
);

router.get(
  "/classes",
  asyncHandler(async (_req, res) => {
    const rows = await classService.listClasses({}, { defaultFromNow: false });
    res.json({ data: rows });
  })
);

router.post(
  "/classes",
  validateBody(createClassBodySchema),
  asyncHandler(async (req, res) => {
    const row = await classService.createClass(req.body);
    res.status(201).json({ data: row });
  })
);

router.patch(
  "/classes/:id",
  validateParams(idParamSchema),
  validateBody(updateClassBodySchema),
  asyncHandler(async (req, res) => {
    const row = await classService.updateClass(req.params.id, req.body);
    res.json({ data: row });
  })
);

router.delete(
  "/classes/:id",
  validateParams(idParamSchema),
  asyncHandler(async (req, res) => {
    await classService.deleteClass(req.params.id);
    res.status(204).send();
  })
);

router.get(
  "/reservations",
  validateQuery(listReservationsQuerySchema),
  asyncHandler(async (req, res) => {
    const rows = await reservationService.listReservations(
      { appUserId: req.appUser.id, isAdmin: true },
      req.query
    );
    res.json({ data: rows });
  })
);

router.post(
  "/reservations/:id/cancel",
  validateParams(reservationIdParamSchema),
  asyncHandler(async (req, res) => {
    const row = await reservationService.cancelReservation({
      reservationId: req.params.id,
      actor: { appUserId: req.appUser.id, isAdmin: true },
    });
    res.json({ data: row });
  })
);

router.patch(
  "/reservations/:id",
  validateParams(reservationIdParamSchema),
  validateBody(patchReservationStatusBodySchema),
  asyncHandler(async (req, res) => {
    const row = await reservationService.patchReservationStatusAdmin({
      reservationId: req.params.id,
      status: req.body.status,
    });
    res.json({ data: row });
  })
);

export default router;
