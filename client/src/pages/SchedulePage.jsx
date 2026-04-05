import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { apiRequest } from "../api/http.js";

function formatWhen(iso) {
  try {
    return new Date(iso).toLocaleString("bg-BG", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return String(iso);
  }
}

export default function SchedulePage() {
  const { getToken } = useOutletContext();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bookingId, setBookingId] = useState(null);

  const load = () => {
    setLoading(true);
    setError("");
    apiRequest(getToken, "/api/classes")
      .then((j) => setClasses(j.classes ?? []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [getToken]);

  const book = (classId) => {
    setBookingId(classId);
    setError("");
    apiRequest(getToken, `/api/classes/${classId}/reservations`, { method: "POST" })
      .then(() => load())
      .catch((e) => setError(e.message))
      .finally(() => setBookingId(null));
  };

  return (
    <main className="page">
      <h2>График на класове</h2>
      <p className="muted">Показват се предстоящи класове със свободни места.</p>
      {error && <div className="error-banner">{error}</div>}
      {loading ? (
        <p>Зареждане…</p>
      ) : classes.length === 0 ? (
        <p className="muted">Няма предстоящи класове. Добавете данни от админ панела или стартирайте seed скрипта.</p>
      ) : (
        <div className="panel table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Кога</th>
                <th>Услуга</th>
                <th>Студио</th>
                <th>Инструктор</th>
                <th>Места</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {classes.map((c) => {
                const spots = Number(c.spotsLeft);
                const busy = bookingId === c.id;
                return (
                  <tr key={c.id}>
                    <td>
                      {formatWhen(c.startsAt)} – {formatWhen(c.endsAt)}
                    </td>
                    <td>{c.serviceName}</td>
                    <td>{c.studioName}</td>
                    <td>
                      {c.instructorFirstName} {c.instructorLastName}
                    </td>
                    <td>{Number.isFinite(spots) ? spots : "—"}</td>
                    <td>
                      <button
                        type="button"
                        className="primary"
                        disabled={!Number.isFinite(spots) || spots < 1 || busy}
                        onClick={() => book(c.id)}
                      >
                        {busy ? "…" : "Резервирай"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
