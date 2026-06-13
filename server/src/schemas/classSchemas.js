import { z } from "zod";

export const listClassesQuerySchema = z
  .object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  })
  .strict()
  .refine((q) => !q.from || !q.to || q.to >= q.from, {
    message: "`to` must be >= `from`",
    path: ["to"],
  });

const classBodyBase = z
  .object({
    name: z.string().max(160).nullable().optional(),
    description: z.string().max(500).nullable().optional(),
    startsAt: z.coerce.date(),
    price: z.coerce.number().nonnegative().nullable().optional(),
    capacity: z.coerce.number().int().positive(),
    serviceId: z.number().int().positive(),
    studioId: z.number().int().positive(),
    instructorId: z.number().int().positive(),
  })
  .strict();

export const createClassBodySchema = classBodyBase;

export const updateClassBodySchema = classBodyBase.partial();
