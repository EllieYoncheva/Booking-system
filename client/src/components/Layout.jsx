import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/KeycloakContext.jsx";

export default function Layout() {
  const { keycloak, hasRole, getToken } = useAuth();
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
    keycloak.tokenParsed?.preferred_username ?? keycloak.subject ?? "—";

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Пилатес студио</h1>
        <nav className="app-nav">
          <NavLink to="/schedule" className={({ isActive }) => (isActive ? "active" : "")}>
            График
          </NavLink>
          <NavLink to="/bookings" className={({ isActive }) => (isActive ? "active" : "")}>
            Мои резервации
          </NavLink>
          {hasRole("admin") && (
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
          <NavLink
            to="/profile"
            className={({ isActive }) => `app-meta-user${isActive ? " is-active" : ""}`}
          >
            {userLabel}
          </NavLink>
          <button type="button" onClick={() => keycloak.logout()}>
            Изход
          </button>
        </div>
      </header>
      <Outlet context={{ getToken }} />
    </div>
  );
}
