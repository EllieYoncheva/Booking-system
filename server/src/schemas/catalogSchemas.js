import { z } from "zod";

const optionalEmail = z.union([z.string().email().max(255), z.null()]).optional();

export const createStudioBodySchema = z
  .object({
    name: z.string().min(1).max(160),
    country: z.string().max(100).nullable().optional(),
    city: z.string().max(120).nullable().optional(),
    address: z.string().max(500).nullable().optional(),
    phone: z.string().max(32).nullable().optional(),
    email: optionalEmail,
  })
  .strict();

export const updateStudioBodySchema = createStudioBodySchema.partial();

export const createServiceOfferingBodySchema = z
  .object({
    name: z.string().min(1).max(160),
    description: z.string().max(500).nullable().optional(),
  })
  .strict();

export const updateServiceOfferingBodySchema = createServiceOfferingBodySchema.partial();

export const createInstructorBodySchema = z
  .object({
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    phone: z.string().max(32).nullable().optional(),
    email: optionalEmail,
  })
  .strict();

export const updateInstructorBodySchema = createInstructorBodySchema.partial();
