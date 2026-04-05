import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import keycloak, { initKeycloakOnce } from "../config/keycloak";

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const [keycloakReady, setKeycloakReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [userRoles, setUserRoles] = useState([]);
  const refreshTimer = useRef(null);

  useEffect(() => {
    let cancelled = false;

    initKeycloakOnce({
      onLoad: "login-required",
      checkLoginIframe: false,
      pkceMethod: "S256",
    })
      .then((auth) => {
        if (cancelled) return;
        setAuthenticated(auth);
        const extractedRoles = keycloak.tokenParsed?.realm_access?.roles ?? [];
        setUserRoles(extractedRoles);

        refreshTimer.current = setInterval(() => {
          keycloak.updateToken(70).catch(() => keycloak.login());
        }, 60000);

        setKeycloakReady(true);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Keycloak initialization error:", error);
      });

    return () => {
      cancelled = true;
      if (refreshTimer.current) clearInterval(refreshTimer.current);
      refreshTimer.current = null;
    };
  }, []);

  const hasRole = (roles) => {
    const list = Array.isArray(roles) ? roles : [roles];
    const realmRoles = keycloak.tokenParsed?.realm_access?.roles ?? [];
    const clientId = keycloak.clientId;
    const clientRoles =
      keycloak.tokenParsed?.resource_access?.[clientId]?.roles ?? [];
    return list.some(
      (role) => realmRoles.includes(role) || clientRoles.includes(role)
    );
  };

  const getToken = useCallback(async () => {
    await keycloak.updateToken(30);
    return keycloak.token;
  }, []);

  if (!keycloakReady) {
    return <div>Зареждане на автентикация…</div>;
  }

  return (
    <AuthContext.Provider
      value={{ keycloak, authenticated, userRoles, hasRole, getToken }}
    >
      {children}
    </AuthContext.Provider>
  );
};
