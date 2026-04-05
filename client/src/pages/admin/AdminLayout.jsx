import { Navigate, NavLink, Outlet, useOutletContext } from "react-router-dom";
import { useAuth } from "../../context/KeycloakContext.jsx";

export default function AdminLayout() {
  const { hasRole } = useAuth();
  const parent = useOutletContext();

  if (!hasRole("admin")) {
    return <Navigate to="/schedule" replace />;
  }

  return (
    <div className="page">
      <h2>Администрация</h2>
      <nav className="app-nav panel" style={{ marginBottom: "1rem" }}>
        <NavLink to="/admin/studios" className={({ isActive }) => (isActive ? "active" : "")}>
          Студиа
        </NavLink>
        <NavLink to="/admin/services" className={({ isActive }) => (isActive ? "active" : "")}>
          Услуги
        </NavLink>
        <NavLink to="/admin/instructors" className={({ isActive }) => (isActive ? "active" : "")}>
          Инструктори
        </NavLink>
        <NavLink to="/admin/classes" className={({ isActive }) => (isActive ? "active" : "")}>
          Класове
        </NavLink>
      </nav>
      <Outlet context={parent} />
    </div>
  );
}
