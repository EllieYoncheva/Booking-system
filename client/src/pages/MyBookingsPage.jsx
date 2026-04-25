import { useEffect, useMemo, useState } from "react";
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

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

function ReservationTable({ rows, cancelling, canCancel, cancel }) {
  if (rows.length === 0) {
    return <p className="muted">Няма резервации в тази секция.</p>;
  }

  return (
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
              <td>{r.className || r.serviceName || "—"}</td>
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
  );
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

  const { upcoming, past } = useMemo(() => {
    const today = startOfToday();
    const grouped = rows.reduce(
      (acc, row) => {
        const startsAt = new Date(row.classStartsAt).getTime();
        if (Number.isFinite(startsAt) && startsAt < today) acc.past.push(row);
        else acc.upcoming.push(row);
        return acc;
      },
      { upcoming: [], past: [] }
    );
    grouped.upcoming.sort((a, b) => new Date(a.classStartsAt) - new Date(b.classStartsAt));
    grouped.past.sort((a, b) => new Date(b.classStartsAt) - new Date(a.classStartsAt));
    return grouped;
  }, [rows]);

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
        <>
          <section>
            <h3>Предстоящи</h3>
            <ReservationTable rows={upcoming} cancelling={cancelling} canCancel={canCancel} cancel={cancel} />
          </section>
          <section>
            <h3>Минали</h3>
            <ReservationTable rows={past} cancelling={cancelling} canCancel={canCancel} cancel={cancel} />
          </section>
        </>
      )}
    </main>
  );
}
