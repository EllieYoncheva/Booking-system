import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { apiRequest } from "../../api/http.js";

export default function BookingSettingsAdminPage() {
  const { getToken } = useOutletContext();
  const [autoConfirm, setAutoConfirm] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setError("");
    apiRequest(getToken, "/api/admin/settings/booking")
      .then((j) => {
        setAutoConfirm(!!j.autoConfirmBookings);
        setLoaded(true);
      })
      .catch((e) => setError(e.message));
  }, [getToken]);

  const toggle = () => {
    const next = !autoConfirm;
    setSaving(true);
    setError("");
    apiRequest(getToken, "/api/admin/settings/booking", {
      method: "PATCH",
      body: JSON.stringify({ autoConfirmBookings: next }),
    })
      .then((j) => {
        setAutoConfirm(!!j.autoConfirmBookings);
      })
      .catch((e) => setError(e.message))
      .finally(() => setSaving(false));
  };

  return (
    <>
      <h3>Настройки за резервации</h3>
      {error && <div className="error-banner">{error}</div>}
      {!loaded ? (
        <p>Зареждане…</p>
      ) : (
        <div className="panel">
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={autoConfirm}
              disabled={saving}
              onChange={toggle}
            />
            <span>
              <strong>Автоматично потвърждаване</strong>
              <span className="muted block">
                При включване новите резервации веднага стават „потвърдени“. При изключване остават в
                „чака потвърждение“, докато администратор не ги обработи от страницата „Резервации“.
              </span>
            </span>
          </label>
        </div>
      )}
    </>
  );
}
