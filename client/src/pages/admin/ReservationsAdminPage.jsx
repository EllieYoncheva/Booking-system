import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { apiRequest } from "../../api/http.js";
import { RESERVATION_STATUS_BG } from "../../utils/reservationStatusBg.js";

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

const FILTERS = [
  { value: "", label: "Всички" },
  { value: "pending", label: "Нови / чакат потвърждение" },
  { value: "confirmed", label: "Потвърдени" },
  { value: "cancelled_by_user", label: "Анулирани от клиент" },
  { value: "cancelled_by_admin", label: "Анулирани от админ" },
  { value: "no_show", label: "Неявил се" },
];

const STATUS_OPTIONS = [
  { value: "pending", label: "pending" },
  { value: "confirmed", label: "confirmed" },
  { value: "no_show", label: "no show" },
  { value: "cancelled", label: "cancelled" },
];

function statusSelectValue(status) {
  return status === "cancelled_by_user" || status === "cancelled_by_admin"
    ? "cancelled"
    : status;
}

export default function ReservationsAdminPage() {
  const { getToken } = useOutletContext();
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = () => {
    setError("");
    const q = new URLSearchParams();
    q.set("limit", "100");
    if (status) q.set("status", status);
    return apiRequest(getToken, `/api/admin/reservations?${q}`)
      .then((j) => setRows(j.reservations ?? []))
      .catch((e) => setError(e.message));
  };

  useEffect(() => {
    load();
  }, [getToken, status]);

  const updateStatus = (reservationId, nextStatus) => {
    setBusyId(reservationId);
    setError("");
    apiRequest(getToken, `/api/admin/reservations/${reservationId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: nextStatus }),
    })
      .then(() => load())
      .catch((e) => setError(e.message))
      .finally(() => setBusyId(null));
  };

  return (
    <>
      <h3>Резервации</h3>
      {error && <div className="error-banner">{error}</div>}
      <div className="panel" style={{ marginBottom: "1rem" }}>
        <label>
          Филтър по статус
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {FILTERS.map((f) => (
              <option key={f.value || "all"} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="panel table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>ID</th>
              <th>Клиент</th>
              <th>Клас</th>
              <th>Начало</th>
              <th>Статус</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>
                  <div>
                    {r.clientFirstName} {r.clientLastName}
                  </div>
                  <div className="muted small">
                    <Link to={`/admin/clients/${r.userId}`}>
                      {r.clientEmail}
                    </Link>
                  </div>
                </td>
                <td>{r.className ?? "—"}</td>
                <td>{formatWhen(r.classStartsAt)}</td>
                <td>{RESERVATION_STATUS_BG[r.status] ?? r.status}</td>
                <td>
                  <select
                    value={statusSelectValue(r.status)}
                    disabled={busyId === r.id}
                    onChange={(e) => updateStatus(r.id, e.target.value)}
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="muted">Няма резервации за избрания филтър.</p>
        )}
      </div>
    </>
  );
}
