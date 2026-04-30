import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/KeycloakContext.jsx";

export default function Layout() {
  const { keycloak, authenticated, hasRole, getToken } = useAuth();
  const [dbOk, setDbOk] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/health")
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled) setDbOk(!!j?.database?.connected);
      })
      .catch(() => {
        if (!cancelled) setDbOk(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const userLabel =
    authenticated ? keycloak.tokenParsed?.preferred_username ?? keycloak.subject ?? "—" : "Гост";

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Пилатес студио</h1>
        <nav className="app-nav">
          <NavLink to="/schedule" className={({ isActive }) => (isActive ? "active" : "")}>
            График
          </NavLink>
          {authenticated && (
            <NavLink to="/bookings" className={({ isActive }) => (isActive ? "active" : "")}>
              Мои резервации
            </NavLink>
          )}
          {authenticated && hasRole("admin") && (
            <NavLink to="/admin/studios" className={({ isActive }) => (isActive ? "active" : "")}>
              Админ
            </NavLink>
          )}
        </nav>
        <div className="app-meta">
          <span>
            База:{" "}
            {dbOk === null ? "…" : dbOk ? <span className="ok">свързана</span> : "няма връзка"}
          </span>
          {authenticated ? (
            <>
              <NavLink
                to="/profile"
                className={({ isActive }) => `app-meta-user${isActive ? " is-active" : ""}`}
              >
                {userLabel}
              </NavLink>
              <button type="button" onClick={() => keycloak.logout()}>
                Изход
              </button>
            </>
          ) : (
            <>
              <span className="app-meta-user">{userLabel}</span>
              <button type="button" onClick={() => keycloak.login()}>
                Вход
              </button>
            </>
          )}
        </div>
      </header>
      <Outlet context={{ authenticated, getToken, keycloak }} />
    </div>
  );
}
