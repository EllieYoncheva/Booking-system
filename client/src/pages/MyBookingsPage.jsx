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
  const [waitlist, setWaitlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(null);
  const [leavingWaitlist, setLeavingWaitlist] = useState(null);

  const load = () => {
    setLoading(true);
    setError("");
    apiRequest(getToken, "/api/me/reservations")
      .then((j) => {
        setRows(j.reservations ?? []);
        setWaitlist(j.waitlist ?? []);
      })
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

  const leaveWaitlist = (classId) => {
    setLeavingWaitlist(classId);
    setError("");
    apiRequest(getToken, `/api/me/reservations/waitlist/${classId}`, { method: "DELETE" })
      .then(() => load())
      .catch((e) => setError(e.message))
      .finally(() => setLeavingWaitlist(null));
  };

  return (
    <main className="page">
      <h2>Мои резервации</h2>
      {error && <div className="error-banner">{error}</div>}
      {loading ? (
        <p>Зареждане…</p>
      ) : rows.length === 0 && waitlist.length === 0 ? (
        <p className="muted">Нямате резервации или записвания на листа на изчакване.</p>
      ) : (
        <>
          {rows.length > 0 && (
            <div className="panel table-wrap">
              <h3 style={{ marginTop: 0, marginBottom: "0.75rem" }}>Резервации</h3>
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
          {waitlist.length > 0 && (
            <div className="panel table-wrap">
              <h3 style={{ marginTop: 0, marginBottom: "0.5rem" }}>Листа на изчакване</h3>
              <p className="muted small" style={{ marginTop: 0 }}>
                Записани сте за пълни класове. При освобождаване на място администраторът може да се свърже с вас.
              </p>
              <table className="data">
                <thead>
                  <tr>
                    <th>Клас</th>
                    <th>Кога</th>
                    <th>Студио</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {waitlist.map((w) => (
                    <tr key={w.id}>
                      <td>{w.className || "—"}</td>
                      <td>
                        {formatWhen(w.classStartsAt)} – {formatWhen(w.classEndsAt)}
                      </td>
                      <td>{w.studioName}</td>
                      <td>
                        <button
                          type="button"
                          disabled={leavingWaitlist === w.classId}
                          onClick={() => leaveWaitlist(w.classId)}
                        >
                          {leavingWaitlist === w.classId ? "…" : "Отпиши се"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </main>
  );
}
