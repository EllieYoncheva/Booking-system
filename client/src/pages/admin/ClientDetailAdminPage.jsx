import { useEffect, useState } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
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

export default function ClientDetailAdminPage() {
  const { id } = useParams();
  const { getToken } = useOutletContext();
  const [client, setClient] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [blockingAction, setBlockingAction] = useState("");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    notes: "",
    internalNotes: "",
  });

  const load = () => {
    setError("");
    const cid = Number(id);
    if (!Number.isInteger(cid) || cid < 1) {
      setError("Невалиден клиент");
      return Promise.resolve();
    }
    return Promise.all([
      apiRequest(getToken, `/api/admin/clients/${cid}`).then((j) => {
        const c = j.client;
        setClient(c);
        setForm({
          firstName: c.firstName ?? "",
          lastName: c.lastName ?? "",
          email: c.email ?? "",
          phone: c.phone ?? "",
          notes: c.notes ?? "",
          internalNotes: c.internalNotes ?? "",
        });
      }),
      apiRequest(
        getToken,
        `/api/admin/clients/${cid}/reservations?limit=100`,
      ).then((j) => setReservations(j.reservations ?? [])),
    ]).catch((e) => setError(e.message));
  };

  useEffect(() => {
    load();
  }, [getToken, id]);

  const save = (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const cid = Number(id);
    apiRequest(getToken, `/api/admin/clients/${cid}`, {
      method: "PATCH",
      body: JSON.stringify(form),
    })
      .then((j) => {
        setClient(j.client);
      })
      .catch((err) => setError(err.message))
      .finally(() => setSaving(false));
  };

  const updateBookingBlock = (blocked) => {
    if (!client) return;
    const message = blocked
      ? "Блокирай клиента за онлайн резервации?"
      : "Разблокирай клиента за онлайн резервации?";
    if (!window.confirm(message)) return;
    setBlockingAction(blocked ? "block" : "unblock");
    setError("");
    const cid = Number(id);
    const action = blocked ? "block-online-booking" : "unblock-online-booking";
    apiRequest(getToken, `/api/admin/clients/${cid}/${action}`, {
      method: "POST",
    })
      .then((j) => setClient(j.client))
      .catch((err) => setError(err.message))
      .finally(() => setBlockingAction(""));
  };

  if (!client && !error) {
    return <p>Зареждане…</p>;
  }

  return (
    <>
      <p>
        <Link to="/admin/clients">← Към списъка с клиенти</Link>
      </p>
      <h3>
        Клиент #{id}: {client ? `${client.firstName} ${client.lastName}` : ""}
      </h3>
      {error && <div className="error-banner">{error}</div>}
      {client && (
        <div className="panel">
          <h4>Данни и бележки</h4>
          <form className="form-grid" onSubmit={save}>
            <label>
              Име
              <input
                required
                value={form.firstName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, firstName: e.target.value }))
                }
              />
            </label>
            <label>
              Фамилия
              <input
                required
                value={form.lastName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, lastName: e.target.value }))
                }
              />
            </label>
            <label style={{ gridColumn: "1 / -1" }}>
              Имейл
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
              />
            </label>
            <label style={{ gridColumn: "1 / -1" }}>
              Телефон
              <input
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
              />
            </label>
            <label style={{ gridColumn: "1 / -1" }}>
              Бележки (към профила)
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
              />
            </label>
            <label style={{ gridColumn: "1 / -1" }}>
              Вътрешни бележки (само за екипа)
              <textarea
                rows={4}
                value={form.internalNotes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, internalNotes: e.target.value }))
                }
              />
            </label>
            <button type="submit" disabled={saving}>
              {saving ? "Запис…" : "Запази промените"}
            </button>
          </form>
        </div>
      )}
      {client && (
        <div className="panel" style={{ marginTop: "1rem" }}>
          <h4>Онлайн резервации</h4>
          <p>
            Статус:{" "}
            <strong>
              {client.onlineBookingBlocked ? "Блокиран" : "Активен"}
            </strong>
          </p>
          <p className="muted">
            Неявявания: {Number(client.noShowCount ?? 0)} · Източник:{" "}
            {client.bookingBlockedSource === "auto_no_show"
              ? "автоматично при неявявания"
              : client.bookingBlockedSource === "admin_manual"
                ? "ръчно от администратор"
                : "—"}
          </p>

          <button
            type="button"
            className="danger"
            disabled={client.onlineBookingBlocked || blockingAction !== ""}
            onClick={() => updateBookingBlock(true)}
          >
            {blockingAction === "block"
              ? "Блокиране…"
              : "Блокирай за онлайн резервации"}
          </button>
          <button
            type="button"
            disabled={!client.onlineBookingBlocked || blockingAction !== ""}
            onClick={() => updateBookingBlock(false)}
          >
            {blockingAction === "unblock"
              ? "Разблокиране…"
              : "Разблокирай за онлайн резервации"}
          </button>
        </div>
      )}
      <div className="panel table-wrap" style={{ marginTop: "1rem" }}>
        <h4>История на резервациите</h4>
        {reservations.length === 0 ? (
          <p className="muted">Няма резервации.</p>
        ) : (
          <table className="data">
            <thead>
              <tr>
                <th>ID</th>
                <th>Клас</th>
                <th>Начало</th>
                <th>Статус</th>
                <th>Причина (админ)</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td>{r.className ?? "—"}</td>
                  <td>{formatWhen(r.classStartsAt)}</td>
                  <td>{RESERVATION_STATUS_BG[r.status] ?? r.status}</td>
                  <td>{r.adminCancelReason ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
