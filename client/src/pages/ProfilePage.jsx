import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { apiRequest } from "../api/http.js";
import { ONLINE_BOOKING_BLOCKED_MESSAGE } from "../utils/bookingBlock.js";

export default function ProfilePage() {
  const { getToken } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [appUser, setAppUser] = useState(null);
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
        setAppUser(u ?? null);
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
        setAppUser(u ?? null);
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

  return (
    <main className="page page--schedule">
      <h2>Моят профил</h2>
      <p className="muted">
        Актуализирайте личните си данни за резервации и контакт.
      </p>
      {error && <div className="error-banner">{error}</div>}
      {ok && <p className="ok-banner">{ok}</p>}
      {appUser?.onlineBookingBlocked && (
        <div className="error-banner">{ONLINE_BOOKING_BLOCKED_MESSAGE}</div>
      )}
      {loading ? (
        <p>Зареждане…</p>
      ) : (
        <section className="bookings-section">
          <div className="schedule-by-day">
            <div className="profile-panel schedule-card profile-panel-card">
              <p className="muted profile-panel-hint">
                Имейлът идва от акаунта ви за вход и не може да се промени тук.
              </p>
              <form className="profile-form" onSubmit={save}>
                <label className="profile-field profile-field--full">
                  <span className="profile-field-label">
                    Имейл (само за преглед)
                  </span>
                  <input type="email" readOnly value={accountEmail} />
                </label>
                <label className="profile-field profile-field--full">
                  <span className="profile-field-label">
                    Онлайн резервации
                  </span>
                  <input
                    readOnly
                    value={
                      appUser?.onlineBookingBlocked
                        ? `Блокиран (${Number(appUser?.noShowCount ?? 0)} неяв.)`
                        : `Активен (${Number(appUser?.noShowCount ?? 0)} неяв.)`
                    }
                  />
                </label>
                <label className="profile-field">
                  <span className="profile-field-label">Име *</span>
                  <input
                    required
                    value={form.firstName}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, firstName: e.target.value }))
                    }
                  />
                </label>
                <label className="profile-field">
                  <span className="profile-field-label">Фамилия *</span>
                  <input
                    required
                    value={form.lastName}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, lastName: e.target.value }))
                    }
                  />
                </label>
                <label className="profile-field profile-field--full">
                  <span className="profile-field-label">Телефон *</span>
                  <input
                    required
                    value={form.phone}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, phone: e.target.value }))
                    }
                    placeholder="По желание"
                  />
                </label>
                <div className="profile-form-actions">
                  <button
                    type="submit"
                    className="primary schedule-card-book-btn"
                    disabled={saving}
                  >
                    {saving ? "Запазване…" : "Запази"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
