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
    endsAt: z.coerce.date(),
    price: z.coerce.number().nonnegative().nullable().optional(),
    capacity: z.coerce.number().int().positive(),
    serviceId: z.number().int().positive(),
    studioId: z.number().int().positive(),
    instructorId: z.number().int().positive(),
  })
  .strict();

export const createClassBodySchema = classBodyBase.refine((b) => b.endsAt > b.startsAt, {
  message: "endsAt must be after startsAt",
  path: ["endsAt"],
});

export const updateClassBodySchema = classBodyBase.partial().refine(
  (b) => b.startsAt == null || b.endsAt == null || b.endsAt > b.startsAt,
  {
    message: "endsAt must be after startsAt",
    path: ["endsAt"],
  }
);
