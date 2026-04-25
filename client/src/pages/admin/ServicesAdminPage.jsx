import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { apiRequest } from "../../api/http.js";

export default function ServicesAdminPage() {
  const { getToken } = useOutletContext();
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: "", description: "", duration: "60" });

  const load = () =>
    apiRequest(getToken, "/api/admin/services")
      .then((j) => setRows(j.services ?? []))
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, [getToken]);

  const reset = () => {
    setEditingId(null);
    setForm({ name: "", description: "", duration: "60" });
  };

  const save = (e) => {
    e.preventDefault();
    setError("");
    const duration = Number(form.duration);
    if (!Number.isInteger(duration) || duration < 1) {
      setError("Продължителността трябва да е положително число.");
      return;
    }
    const body = JSON.stringify({ ...form, duration });
    const req =
      editingId == null
        ? apiRequest(getToken, "/api/admin/services", { method: "POST", body })
        : apiRequest(getToken, `/api/admin/services/${editingId}`, { method: "PATCH", body });
    req.then(() => {
      reset();
      return load();
    }).catch((err) => setError(err.message));
  };

  const edit = (r) => {
    setEditingId(r.id);
    setForm({ name: r.name ?? "", description: r.description ?? "", duration: String(r.duration ?? 60) });
  };

  const remove = (id) => {
    if (!window.confirm("Изтриване на услуга?")) return;
    setError("");
    apiRequest(getToken, `/api/admin/services/${id}`, { method: "DELETE" })
      .then(() => load())
      .catch((e) => setError(e.message));
  };

  return (
    <>
      <h3>Услуги</h3>
      {error && <div className="error-banner">{error}</div>}
      <div className="panel">
        <form className="form-grid" onSubmit={save}>
          <label>
            Име *
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </label>
          <label>
            Описание
            <textarea rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </label>
          <label>
            Продължителност (минути) *
            <input
              required
              type="number"
              min={1}
              value={form.duration}
              onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
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
              <th>Име</th>
              <th>Описание</th>
              <th>Продължителност</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td>{r.description || "—"}</td>
                <td>{r.duration} мин</td>
                <td>
                  <button type="button" onClick={() => edit(r)}>
                    Редакция
                  </button>{" "}
                  <button type="button" className="danger" onClick={() => remove(r.id)}>
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
