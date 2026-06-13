import { z } from "zod";

export const createBookingBodySchema = z
  .object({
    classId: z.number().int().positive(),
  })
  .strict();

export const reservationIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const listReservationsQuerySchema = z
  .object({
    userId: z.coerce.number().int().positive().optional(),
    classId: z.coerce.number().int().positive().optional(),
    status: z
      .enum([
        "pending",
        "confirmed",
        "cancelled_by_user",
        "cancelled_by_admin",
        "no_show",
      ])
      .optional(),
    limit: z.coerce.number().int().min(1).max(100).optional().default(50),
    offset: z.coerce.number().int().min(0).optional().default(0),
  })
  .strict();

export const patchReservationStatusBodySchema = z
  .object({
    status: z.enum(["pending", "confirmed", "no_show"]),
  })
  .strict();
