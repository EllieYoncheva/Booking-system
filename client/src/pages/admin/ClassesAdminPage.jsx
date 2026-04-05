import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { apiRequest } from "../../api/http.js";

function toLocalInput(iso) {
  if (!iso) return "";
  const x = new Date(iso);
  if (Number.isNaN(x.getTime())) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}T${p(x.getHours())}:${p(x.getMinutes())}`;
}

function fromLocalInput(local) {
  if (!local) return "";
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

function formatWhen(iso) {
  try {
    return new Date(iso).toLocaleString("bg-BG", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return String(iso);
  }
}

export default function ClassesAdminPage() {
  const { getToken } = useOutletContext();
  const [classes, setClasses] = useState([]);
  const [studios, setStudios] = useState([]);
  const [services, setServices] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    startsLocal: "",
    endsLocal: "",
    price: "",
    capacity: "10",
    serviceId: "",
    studioId: "",
    instructorId: "",
    cancellationReason: "",
  });

  const loadRefs = () =>
    Promise.all([
      apiRequest(getToken, "/api/admin/studios"),
      apiRequest(getToken, "/api/admin/services"),
      apiRequest(getToken, "/api/admin/instructors"),
    ]).then(([st, se, ins]) => {
      setStudios(st.studios ?? []);
      setServices(se.services ?? []);
      setInstructors(ins.instructors ?? []);
    });

  const loadClasses = () =>
    apiRequest(getToken, "/api/admin/classes").then((j) => setClasses(j.classes ?? []));

  useEffect(() => {
    setError("");
    Promise.all([loadRefs(), loadClasses()]).catch((e) => setError(e.message));
  }, [getToken]);

  const reset = () => {
    setEditingId(null);
    setForm({
      name: "",
      description: "",
      startsLocal: "",
      endsLocal: "",
      price: "",
      capacity: "10",
      serviceId: "",
      studioId: "",
      instructorId: "",
      cancellationReason: "",
    });
  };

  const save = (e) => {
    e.preventDefault();
    setError("");
    const startsAt = fromLocalInput(form.startsLocal);
    const endsAt = fromLocalInput(form.endsLocal);
    if (!startsAt || !endsAt) {
      setError("Невалидни дата и час.");
      return;
    }
    const base = {
      name: form.name || null,
      description: form.description || null,
      startsAt,
      endsAt,
      price: form.price === "" ? null : Number(form.price),
      capacity: Number(form.capacity),
      serviceId: Number(form.serviceId),
      studioId: Number(form.studioId),
      instructorId: Number(form.instructorId),
      cancellationReason: form.cancellationReason.trim() || null,
    };
    if (!Number.isInteger(base.capacity) || base.capacity < 1) {
      setError("Капацитетът трябва да е положително число.");
      return;
    }
    if (![base.serviceId, base.studioId, base.instructorId].every((n) => Number.isInteger(n) && n > 0)) {
      setError("Изберете услуга, студио и инструктор.");
      return;
    }
    if (base.price != null && Number.isNaN(base.price)) {
      setError("Невалидна цена.");
      return;
    }
    const body = JSON.stringify(base);
    const req =
      editingId == null
        ? apiRequest(getToken, "/api/admin/classes", { method: "POST", body })
        : apiRequest(getToken, `/api/admin/classes/${editingId}`, { method: "PATCH", body });
    req.then(() => {
      reset();
      return loadClasses();
    }).catch((err) => setError(err.message));
  };

  const edit = (c) => {
    setEditingId(c.id);
    setForm({
      name: c.name ?? "",
      description: c.description ?? "",
      startsLocal: toLocalInput(c.startsAt),
      endsLocal: toLocalInput(c.endsAt),
      price: c.price != null ? String(c.price) : "",
      capacity: String(c.capacity ?? 10),
      serviceId: String(c.serviceId ?? ""),
      studioId: String(c.studioId ?? ""),
      instructorId: String(c.instructorId ?? ""),
      cancellationReason: c.cancellationReason ?? "",
    });
  };

  const remove = (id) => {
    if (!window.confirm("Изтриване на клас? (Невъзможно при налични резервации.)")) return;
    setError("");
    apiRequest(getToken, `/api/admin/classes/${id}`, { method: "DELETE" })
      .then(() => loadClasses())
      .catch((e) => setError(e.message));
  };

  return (
    <>
      <h3>Класове</h3>
      {error && <div className="error-banner">{error}</div>}
      <div className="panel">
        <form className="form-grid" onSubmit={save} style={{ maxWidth: "36rem" }}>
          <label>
            Име (по избор)
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </label>
          <label>
            Описание
            <textarea rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </label>
          <label>
            Начало *
            <input
              type="datetime-local"
              required
              value={form.startsLocal}
              onChange={(e) => setForm((f) => ({ ...f, startsLocal: e.target.value }))}
            />
          </label>
          <label>
            Край *
            <input
              type="datetime-local"
              required
              value={form.endsLocal}
              onChange={(e) => setForm((f) => ({ ...f, endsLocal: e.target.value }))}
            />
          </label>
          <label>
            Цена
            <input type="number" step="0.01" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
          </label>
          <label>
            Капацитет *
            <input
              required
              type="number"
              min={1}
              value={form.capacity}
              onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
            />
          </label>
          <label>
            Услуга *
            <select
              required
              value={form.serviceId}
              onChange={(e) => setForm((f) => ({ ...f, serviceId: e.target.value }))}
            >
              <option value="">—</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Студио *
            <select
              required
              value={form.studioId}
              onChange={(e) => setForm((f) => ({ ...f, studioId: e.target.value }))}
            >
              <option value="">—</option>
              {studios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Инструктор *
            <select
              required
              value={form.instructorId}
              onChange={(e) => setForm((f) => ({ ...f, instructorId: e.target.value }))}
            >
              <option value="">—</option>
              {instructors.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.firstName} {i.lastName}
                </option>
              ))}
            </select>
          </label>
          <label>
            Причина за отмяна (скрива от публичния график)
            <input
              value={form.cancellationReason}
              onChange={(e) => setForm((f) => ({ ...f, cancellationReason: e.target.value }))}
            />
          </label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="submit" className="primary">
              {editingId == null ? "Създай" : "Запази"}
            </button>
            {editingId != null && (
              <button type="button" onClick={reset}>
                Отказ
              </button>
            )}
          </div>
        </form>
      </div>
      <div className="panel table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Кога</th>
              <th>Услуга / студио</th>
              <th>Капацитет</th>
              <th>Отмяна</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {classes.map((c) => (
              <tr key={c.id}>
                <td>
                  {formatWhen(c.startsAt)} – {formatWhen(c.endsAt)}
                </td>
                <td>
                  {c.serviceName} / {c.studioName}
                </td>
                <td>{c.capacity}</td>
                <td>
                  {c.cancellationReason
                    ? c.cancellationReason.length > 36
                      ? `${c.cancellationReason.slice(0, 36)}…`
                      : c.cancellationReason
                    : "—"}
                </td>
                <td>
                  <button type="button" onClick={() => edit(c)}>
                    Редакция
                  </button>{" "}
                  <button type="button" className="danger" onClick={() => remove(c.id)}>
                    Изтрий
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
