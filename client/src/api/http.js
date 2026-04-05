import keycloak from "../config/keycloak.js";

const apiBase = () => import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";

export class ApiError extends Error {
  /**
   * @param {string} message
   * @param {{ status?: number, code?: string }} [meta]
   */
  constructor(message, meta = {}) {
    super(message);
    this.name = "ApiError";
    this.status = meta.status;
    this.code = meta.code;
  }
}

/**
 * @param {Response} response
 */
async function parseErrorBody(response) {
  const text = await response.text();
  try {
    const json = JSON.parse(text);
    const err = json?.error;
    if (err && typeof err === "object") {
      return new ApiError(err.message || response.statusText, {
        status: response.status,
        code: err.code,
      });
    }
  } catch {
    // ignore JSON parse errors
  }
  return new ApiError(text || response.statusText, { status: response.status });
}

/**
 * @param {string} path
 * @param {{ method?: string, body?: unknown, headers?: Record<string, string> }} [options]
 */
export async function apiFetch(path, options = {}) {
  const { method = "GET", body, headers: extraHeaders = {} } = options;
  await keycloak.updateToken(30).catch(() => keycloak.login());
  const token = keycloak.token;
  if (!token) {
    throw new ApiError("Not authenticated", { status: 401 });
  }
  const url = `${apiBase()}${path.startsWith("/") ? path : `/${path}`}`;
  /** @type {Record<string, string>} */
  const headers = {
    Accept: "application/json",
    ...extraHeaders,
    Authorization: `Bearer ${token}`,
  };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  const response = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (response.status === 204) {
    return null;
  }
  const contentType = response.headers.get("content-type") || "";
  if (!response.ok) {
    throw await parseErrorBody(response);
  }
  if (!contentType.includes("application/json")) {
    return null;
  }
  return response.json();
}
