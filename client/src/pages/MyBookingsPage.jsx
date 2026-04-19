import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { apiRequest } from "../api/http.js";
import { RESERVATION_STATUS_BG } from "../utils/reservationStatusBg.js";

const MY_STATUS_LABELS = {
  ...RESERVATION_STATUS_BG,
  cancelled_by_user: "Анулирана от вас",
};

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

export default function MyBookingsPage() {
  const { getToken } = useOutletContext();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(null);

  const load = () => {
    setLoading(true);
    setError("");
    apiRequest(getToken, "/api/me/reservations")
      .then((j) => setRows(j.reservations ?? []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [getToken]);

  const canCancel = (s) => s === "pending" || s === "confirmed";

  const cancel = (id) => {
    setCancelling(id);
    setError("");
    apiRequest(getToken, `/api/reservations/${id}/cancel`, { method: "PATCH" })
      .then(() => load())
      .catch((e) => setError(e.message))
      .finally(() => setCancelling(null));
  };

  return (
    <main className="page">
      <h2>Мои резервации</h2>
      {error && <div className="error-banner">{error}</div>}
      {loading ? (
        <p>Зареждане…</p>
      ) : rows.length === 0 ? (
        <p className="muted">Нямате резервации.</p>
      ) : (
        <div className="panel table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Клас</th>
                <th>Кога</th>
                <th>Студио</th>
                <th>Статус</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.className || "—"}</td>
                  <td>
                    {formatWhen(r.classStartsAt)} – {formatWhen(r.classEndsAt)}
                  </td>
                  <td>{r.studioName}</td>
                  <td>{MY_STATUS_LABELS[r.status] ?? r.status}</td>
                  <td>
                    {canCancel(r.status) && (
                      <button
                        type="button"
                        className="danger"
                        disabled={cancelling === r.id}
                        onClick={() => cancel(r.id)}
                      >
                        {cancelling === r.id ? "…" : "Анулирай"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
