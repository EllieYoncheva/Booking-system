/**
 * @param {() => Promise<string | undefined>} getToken
 * @param {string} path
 * @param {RequestInit} [options]
 */
export async function apiRequest(getToken, path, options = {}) {
  const token = await getToken();
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body != null) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(path, { ...options, headers });
  const text = await res.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  if (!res.ok) {
    const msg =
      typeof body === "object" && body && "error" in body ? String(body.error) : res.statusText;
    const err = new Error(msg || `HTTP ${res.status}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}
