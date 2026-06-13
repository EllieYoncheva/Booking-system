import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { apiRequest } from "../../api/http.js";

export default function ClientsAdminPage() {
  const { getToken } = useOutletContext();
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const load = () => {
    setError("");
    const q = new URLSearchParams();
    if (search.trim()) q.set("search", search.trim());
    q.set("limit", "100");
    const path = `/api/admin/clients${q.toString() ? `?${q}` : ""}`;
    return apiRequest(getToken, path)
      .then((j) => setRows(j.clients ?? []))
      .catch((e) => setError(e.message));
  };

  useEffect(() => {
    load();
  }, [getToken]);

  const submitSearch = (e) => {
    e.preventDefault();
    load();
  };

  return (
    <>
      <h3>Клиенти</h3>
      {error && <div className="error-banner">{error}</div>}
      <div className="panel" style={{ marginBottom: "1rem" }}>
        <form className="form-grid" onSubmit={submitSearch} style={{ alignItems: "end" }}>
          <label style={{ gridColumn: "1 / -1" }}>
            Търсене (име, имейл, телефон)
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Започнете да пишете…"
            />
          </label>
          <button type="submit">Търси</button>
        </form>
      </div>
      <div className="panel table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>ID</th>
              <th>Име</th>
              <th>Имейл</th>
              <th>Телефон</th>
              <th>Статус</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td>{c.id}</td>
                <td>
                  {c.firstName} {c.lastName}
                </td>
                <td>{c.email}</td>
                <td>{c.phone ?? "—"}</td>
                <td>
                  {c.onlineBookingBlocked ? "Блокиран" : "Активен"} (
                  {Number(c.noShowCount ?? 0)} неяв.)
                </td>
                <td>
                  <Link to={`/admin/clients/${c.id}`}>Профил</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="muted">Няма намерени клиенти.</p>}
      </div>
    </>
  );
}
