import { AppError } from "../errors/AppError.js";

function formatZodError(err) {
  return err.flatten();
}

/**
 * @param {import("zod").ZodSchema} schema
 * @param {'body'|'query'|'params'} source
 */
export function validateRequest(schema, source) {
  return (req, _res, next) => {
    const parsed = schema.safeParse(req[source]);
    if (!parsed.success) {
      return next(
        new AppError("Validation failed", 422, "VALIDATION_ERROR", formatZodError(parsed.error))
      );
    }
    req[source] = parsed.data;
    next();
  };
}

export function validateBody(schema) {
  return validateRequest(schema, "body");
}

export function validateQuery(schema) {
  return validateRequest(schema, "query");
}

export function validateParams(schema) {
  return validateRequest(schema, "params");
}
