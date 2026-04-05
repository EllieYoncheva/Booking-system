import Keycloak from "keycloak-js";

const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL || "http://localhost:8080",
  realm: import.meta.env.VITE_KEYCLOAK_REALM || "booking-system",
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || "booking-system-web",
});

/** Single init promise — keycloak-js allows init() only once; React Strict Mode runs effects twice in dev. */
let initPromise = null;

export function initKeycloakOnce(options) {
  if (initPromise === null) {
    initPromise = keycloak.init(options).catch((err) => {
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}

export const getToken = () => keycloak.token;

export default keycloak;
