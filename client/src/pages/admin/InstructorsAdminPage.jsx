import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { apiRequest } from "../../api/http.js";

export default function InstructorsAdminPage() {
  const { getToken } = useOutletContext();
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", email: "" });

  const load = () =>
    apiRequest(getToken, "/api/admin/instructors")
      .then((j) => setRows(j.instructors ?? []))
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, [getToken]);

  const reset = () => {
    setEditingId(null);
    setForm({ firstName: "", lastName: "", phone: "", email: "" });
  };

  const save = (e) => {
    e.preventDefault();
    setError("");
    const body = JSON.stringify(form);
    const req =
      editingId == null
        ? apiRequest(getToken, "/api/admin/instructors", { method: "POST", body })
        : apiRequest(getToken, `/api/admin/instructors/${editingId}`, { method: "PATCH", body });
    req.then(() => {
      reset();
      return load();
    }).catch((err) => setError(err.message));
  };

  const edit = (r) => {
    setEditingId(r.id);
    setForm({
      firstName: r.firstName ?? "",
      lastName: r.lastName ?? "",
      phone: r.phone ?? "",
      email: r.email ?? "",
    });
  };

  const remove = (id) => {
    if (!window.confirm("Изтриване на инструктор?")) return;
    setError("");
    apiRequest(getToken, `/api/admin/instructors/${id}`, { method: "DELETE" })
      .then(() => load())
      .catch((e) => setError(e.message));
  };

  return (
    <>
      <h3>Инструктори</h3>
      {error && <div className="error-banner">{error}</div>}
      <div className="panel">
        <form className="form-grid" onSubmit={save}>
          <label>
            Име *
            <input
              required
              value={form.firstName}
              onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
            />
          </label>
          <label>
            Фамилия *
            <input
              required
              value={form.lastName}
              onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
            />
          </label>
          <label>
            Телефон
            <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          </label>
          <label>
            Имейл
            <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
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
              <th>Контакт</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  {r.firstName} {r.lastName}
                </td>
                <td>{r.email || r.phone || "—"}</td>
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
