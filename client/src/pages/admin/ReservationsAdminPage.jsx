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
  { value: "no_show", label: "Неявяване" },
];

export default function ReservationsAdminPage() {
  const { getToken } = useOutletContext();
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [cancelModal, setCancelModal] = useState(null);
  const [cancelReason, setCancelReason] = useState("");

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

  const confirm = (reservationId) => {
    setBusyId(reservationId);
    setError("");
    apiRequest(getToken, `/api/admin/reservations/${reservationId}/confirm`, { method: "POST" })
      .then(() => load())
      .catch((e) => setError(e.message))
      .finally(() => setBusyId(null));
  };

  const openCancel = (r) => {
    setCancelModal(r);
    setCancelReason("");
  };

  const submitCancel = () => {
    if (!cancelModal) return;
    const reservationId = cancelModal.id;
    setBusyId(reservationId);
    setError("");
    apiRequest(getToken, `/api/admin/reservations/${reservationId}/cancel`, {
      method: "POST",
      body: JSON.stringify({ reason: cancelReason.trim() || null }),
    })
      .then(() => {
        setCancelModal(null);
        return load();
      })
      .catch((e) => setError(e.message))
      .finally(() => setBusyId(null));
  };

  const canAct = (s) => s === "pending" || s === "confirmed";

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
                    <Link to={`/admin/clients/${r.userId}`}>{r.clientEmail}</Link>
                  </div>
                </td>
                <td>{r.className ?? "—"}</td>
                <td>{formatWhen(r.classStartsAt)}</td>
                <td>{RESERVATION_STATUS_BG[r.status] ?? r.status}</td>
                <td>
                  {canAct(r.status) && (
                    <div className="row-actions">
                      {r.status === "pending" && (
                        <button
                          type="button"
                          disabled={busyId === r.id}
                          onClick={() => confirm(r.id)}
                        >
                          {busyId === r.id ? "…" : "Потвърди"}
                        </button>
                      )}
                      <button type="button" className="danger" onClick={() => openCancel(r)}>
                        Откажи
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="muted">Няма резервации за избрания филтър.</p>}
      </div>
      {cancelModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="cancel-title">
          <div className="panel modal-card">
            <h4 id="cancel-title">Отказ на резервация #{cancelModal.id}</h4>
            <p className="muted">
              {cancelModal.className} — {formatWhen(cancelModal.classStartsAt)}
            </p>
            <label style={{ display: "block", marginTop: "0.75rem" }}>
              Причина (по избор)
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ще се запази като вътрешна бележка към резервацията"
              />
            </label>
            <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
              <button type="button" disabled={busyId === cancelModal.id} onClick={submitCancel}>
                {busyId === cancelModal.id ? "…" : "Потвърди отказ"}
              </button>
              <button type="button" onClick={() => setCancelModal(null)}>
                Затвори
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
