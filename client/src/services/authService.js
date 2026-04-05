/**
 * Keycloak Admin operations go through the Node API (Bearer = user JWT).
 * The server uses its own service account to call Keycloak — never put admin secrets in the browser.
 */

const apiBase = () =>
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";

const headers = (token) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
});

export const createUser = async (token, userData) => {
  const response = await fetch(`${apiBase()}/api/keycloak-admin/users`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("Failed to create user", response.status, text);
    throw new Error(text || `HTTP ${response.status}`);
  }
};

export const addRolesToUser = async (token, userId, roles) => {
  const response = await fetch(
    `${apiBase()}/api/keycloak-admin/users/${userId}/role-mappings/realm`,
    {
      method: "POST",
      headers: headers(token),
      body: JSON.stringify(roles),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    console.error("Failed to add roles", response.status, text);
    throw new Error(text || `HTTP ${response.status}`);
  }
};

export const getRoles = async (token) => {
  const response = await fetch(`${apiBase()}/api/keycloak-admin/roles`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("Failed to get roles", response.status, text);
    throw new Error(text || `HTTP ${response.status}`);
  }

  return response.json();
};

export const getUserByEmail = async (token, userEmail) => {
  const q = new URLSearchParams({ email: userEmail });
  const response = await fetch(
    `${apiBase()}/api/keycloak-admin/users?${q}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!response.ok) {
    const text = await response.text();
    console.error("Failed to get user by email", response.status, text);
    throw new Error(text || `HTTP ${response.status}`);
  }

  return response.json();
};
