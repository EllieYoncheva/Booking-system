export class AppError extends Error {
  /**
   * @param {string} message
   * @param {number} statusCode
   * @param {string} code
   * @param {unknown} [details]
   */
  constructor(message, statusCode = 500, code = "INTERNAL_ERROR", details = undefined) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function assertFound(row, message = "Not found", code = "NOT_FOUND") {
  if (row == null) throw new AppError(message, 404, code);
  return row;
}
