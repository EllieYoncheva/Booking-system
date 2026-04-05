import { config } from "../config.js";

const adminBase = () =>
  `${config.keycloak.url}/admin/realms/${config.keycloak.realm}`;

let cachedToken = null;
let cachedExpiry = 0;

async function getAdminAccessToken() {
  const { adminClientId, adminClientSecret } = config.keycloak;
  if (!adminClientId || !adminClientSecret) {
    throw new Error("Keycloak admin client credentials are not configured");
  }

  const now = Date.now();
  if (cachedToken && cachedExpiry > now + 5000) return cachedToken;

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: adminClientId,
    client_secret: adminClientSecret,
  });

  const tokenUrl = `${config.keycloak.url}/realms/${config.keycloak.realm}/protocol/openid-connect/token`;
  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Keycloak token error: ${res.status} ${text}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  cachedExpiry = now + (data.expires_in || 60) * 1000;
  return cachedToken;
}

export async function keycloakAdminFetch(path, options = {}) {
  const token = await getAdminAccessToken();
  const url = `${adminBase()}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    ...(options.headers || {}),
  };
  return fetch(url, { ...options, headers });
}
