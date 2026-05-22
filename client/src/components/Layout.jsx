import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/KeycloakContext.jsx";
import AppAlertHost from "./AppAlertHost.jsx";

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

  function PersonIcon() {
    return (
      <svg
        className="schedule-card-capacity-icon"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 640 640"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M240 192C240 147.8 275.8 112 320 112C364.2 112 400 147.8 400 192C400 236.2 364.2 272 320 272C275.8 272 240 236.2 240 192zM448 192C448 121.3 390.7 64 320 64C249.3 64 192 121.3 192 192C192 262.7 249.3 320 320 320C390.7 320 448 262.7 448 192zM144 544C144 473.3 201.3 416 272 416L368 416C438.7 416 496 473.3 496 544L496 552C496 565.3 506.7 576 520 576C533.3 576 544 565.3 544 552L544 544C544 446.8 465.2 368 368 368L272 368C174.8 368 96 446.8 96 544L96 552C96 565.3 106.7 576 120 576C133.3 576 144 565.3 144 552L144 544z" />
      </svg>
    );
  }

  const userLabel = authenticated
    ? (keycloak.tokenParsed?.preferred_username ?? keycloak.subject ?? "—")
    : "Гост";

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Пилатес студио</h1>
        <nav className="app-nav">
          <NavLink
            to="/schedule"
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            График
          </NavLink>
          {authenticated && (
            <NavLink
              to="/bookings"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              Мои резервации
            </NavLink>
          )}
          {authenticated && hasRole("admin") && (
            <NavLink
              to="/admin/studios"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              Админ
            </NavLink>
          )}
        </nav>
        <div className="app-meta">
          <span>
            База:{" "}
            {dbOk === null ? (
              "…"
            ) : dbOk ? (
              <span className="ok">свързана</span>
            ) : (
              "няма връзка"
            )}
          </span>

          {authenticated ? (
            <>
              <NavLink
                to="/profile"
                className={({ isActive }) =>
                  `app-meta-user${isActive ? " is-active" : ""}`
                }
              >
                <span className="app-meta-user-inner">
                  <PersonIcon />
                  <span className="app-meta-user-text">{userLabel}</span>
                </span>
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
      <AppAlertHost />
    </div>
  );
}
