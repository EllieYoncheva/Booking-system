import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validateQuery } from "../middleware/validate.js";
import { listClassesQuerySchema } from "../schemas/classSchemas.js";
import * as classService from "../services/classService.js";

const router = Router();

router.get(
  "/",
  validateQuery(listClassesQuerySchema),
  asyncHandler(async (req, res) => {
    const rows = await classService.listClasses(
      { from: req.query.from, to: req.query.to },
      { defaultFromNow: true }
    );
    res.json({ data: rows });
  })
);

export default router;
