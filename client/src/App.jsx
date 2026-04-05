import { useAuth } from "./context/KeycloakContext.jsx";

export default function App() {
  const { keycloak, userRoles, hasRole } = useAuth();

  return (
    <main style={{ fontFamily: "system-ui", padding: "1.5rem", maxWidth: 640 }}>
      <h1>Пилатес студио</h1>
      <p>
        Влязъл като:{" "}
        <strong>{keycloak.tokenParsed?.preferred_username ?? keycloak.subject}</strong>
      </p>
      <p>Роли: {userRoles.length ? userRoles.join(", ") : "няма"}</p>
      {hasRole("admin") && (
        <p style={{ color: "green" }}>Имате администраторски достъп.</p>
      )}
      <button type="button" onClick={() => keycloak.logout()}>
        Изход
      </button>
    </main>
  );
}
