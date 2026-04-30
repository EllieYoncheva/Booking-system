import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { apiRequest } from "../api/http.js";

export default function ProfilePage() {
  const { getToken } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
  });

  const load = () => {
    setLoading(true);
    setError("");
    setOk("");
    apiRequest(getToken, "/api/me")
      .then((j) => {
        const u = j.appUser;
        setAccountEmail(u?.email ?? j.email ?? "");
        setForm({
          firstName: u?.firstName ?? "",
          lastName: u?.lastName ?? "",
          phone: u?.phone ?? "",
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [getToken]);

  const save = (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setOk("");
    apiRequest(getToken, "/api/me", {
      method: "PATCH",
      body: JSON.stringify(form),
    })
      .then((j) => {
        const u = j.appUser;
        setForm({
          firstName: u?.firstName ?? "",
          lastName: u?.lastName ?? "",
          phone: u?.phone ?? "",
        });
        setOk("Промените са запазени.");
      })
      .catch((err) => setError(err.message))
      .finally(() => setSaving(false));
  };

  if (loading) {
    return <p>Зареждане…</p>;
  }

  return (
    <main className="page">
      <h2>Моят профил</h2>
      {error && <div className="error-banner">{error}</div>}
      {ok && (
        <p className="ok block" style={{ marginBottom: "1rem" }}>
          {ok}
        </p>
      )}
      <div className="panel">
        <p className="muted">
          Имейлът идва от акаунта ви за вход и не може да се промени тук.
        </p>
        <form className="form-grid" onSubmit={save}>
          <label style={{ gridColumn: "1 / -1" }}>
            Имейл (само за преглед)
            <input type="email" readOnly value={accountEmail} />
          </label>
          <label>
            Име
            <input
              required
              value={form.firstName}
              onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
            />
          </label>
          <label>
            Фамилия
            <input
              required
              value={form.lastName}
              onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
            />
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            Телефон
            <input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="По желание"
            />
          </label>
          <div style={{ gridColumn: "1 / -1" }}>
            <button type="submit" disabled={saving}>
              {saving ? "Запазване…" : "Запази"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
