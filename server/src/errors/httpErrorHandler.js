import { AppError } from "./AppError.js";

/**
 * Express error-handling middleware (4-arg).
 * @type {import("express").ErrorRequestHandler}
 */
export function httpErrorHandler(err, _req, res, _next) {
  if (err instanceof AppError) {
    const body = {
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined ? { details: err.details } : {}),
      },
    };
    return res.status(err.statusCode).json(body);
  }

  console.error(err);
  const isProd = process.env.NODE_ENV === "production";
  return res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: isProd ? "Internal server error" : err.message,
    },
  });
}
