import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { apiRequest } from "../../api/http.js";

export default function StudiosAdminPage() {
  const { getToken } = useOutletContext();
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    country: "",
    city: "",
    address: "",
    phone: "",
    email: "",
  });

  const load = () =>
    apiRequest(getToken, "/api/admin/studios")
      .then((j) => setRows(j.studios ?? []))
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, [getToken]);

  const reset = () => {
    setEditingId(null);
    setForm({ name: "", country: "", city: "", address: "", phone: "", email: "" });
  };

  const save = (e) => {
    e.preventDefault();
    setError("");
    const body = JSON.stringify(form);
    const req =
      editingId == null
        ? apiRequest(getToken, "/api/admin/studios", { method: "POST", body })
        : apiRequest(getToken, `/api/admin/studios/${editingId}`, {
            method: "PATCH",
            body,
          });
    req.then(() => {
      reset();
      return load();
    }).catch((err) => setError(err.message));
  };

  const edit = (r) => {
    setEditingId(r.id);
    setForm({
      name: r.name ?? "",
      country: r.country ?? "",
      city: r.city ?? "",
      address: r.address ?? "",
      phone: r.phone ?? "",
      email: r.email ?? "",
    });
  };

  const remove = (id) => {
    if (!window.confirm("Изтриване на студио?")) return;
    setError("");
    apiRequest(getToken, `/api/admin/studios/${id}`, { method: "DELETE" })
      .then(() => load())
      .catch((e) => setError(e.message));
  };

  return (
    <>
      <h3>Студиа</h3>
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
            Държава
            <input value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} />
          </label>
          <label>
            Град
            <input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
          </label>
          <label>
            Адрес
            <textarea rows={2} value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
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
              <th>Град</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td>{r.city || "—"}</td>
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
