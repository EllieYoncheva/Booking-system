import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { apiRequest } from "../../api/http.js";

export default function ServicesAdminPage() {
  const { getToken } = useOutletContext();
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: "", description: "" });

  const load = () =>
    apiRequest(getToken, "/api/admin/services")
      .then((j) => setRows(j.services ?? []))
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, [getToken]);

  const reset = () => {
    setEditingId(null);
    setForm({ name: "", description: "" });
  };

  const save = (e) => {
    e.preventDefault();
    setError("");
    const body = JSON.stringify(form);
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
    setForm({ name: r.name ?? "", description: r.description ?? "" });
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
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td>{r.description || "—"}</td>
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
