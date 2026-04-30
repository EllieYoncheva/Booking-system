import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { apiRequest } from "../api/http.js";

/** @param {string} iso */
function localDateKey(iso) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** @param {string} iso */
function formatDayHeading(iso) {
  try {
    return new Date(iso).toLocaleDateString("bg-BG", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return String(iso);
  }
}

/** @param {string} iso */
function formatTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString("bg-BG", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return String(iso);
  }
}

/**
 * @param {Array<Record<string, unknown>>} classes
 * @returns {Array<[string, Array<Record<string, unknown>>]>}
 */
function groupClassesByDate(classes) {
  const map = new Map();
  for (const c of classes) {
    const key = localDateKey(String(c.startsAt));
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(c);
  }
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
}

export default function SchedulePage() {
  const { authenticated, getToken, keycloak } = useOutletContext();
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    apiRequest(getToken, "/api/classes")
      .then((j) => setClasses(j.classes ?? []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [getToken]);

  const byDate = useMemo(() => groupClassesByDate(classes), [classes]);

  const book = (classId) => {
    if (!authenticated) {
      keycloak.login({
        redirectUri: `${window.location.origin}/bookings?classId=${classId}`,
      });
      return;
    }
    navigate(`/bookings?classId=${classId}`);
  };

  return (
    <main className="page page--schedule">
      <h2>График на класове</h2>
      <p className="muted">Показват се предстоящи класове със свободни места.</p>
      {error && <div className="error-banner">{error}</div>}
      {loading ? (
        <p>Зареждане…</p>
      ) : classes.length === 0 ? (
        <p className="muted">
          Няма предстоящи класове. Добавете данни от админ панела или стартирайте seed скрипта.
        </p>
      ) : (
        <div className="schedule-by-day">
          {byDate.map(([dateKey, dayClasses]) => (
            <section key={dateKey} className="schedule-day" aria-labelledby={`schedule-heading-${dateKey}`}>
              <h3 id={`schedule-heading-${dateKey}`} className="schedule-day-heading">
                {formatDayHeading(String(dayClasses[0].startsAt))}
              </h3>
              <div className="schedule-day-line" aria-hidden />
              <ul className="schedule-card-list">
                {dayClasses.map((c) => {
                  const spots = Number(c.spotsLeft);
                  const mins = Number(c.serviceDuration);
                  const title =
                    typeof c.name === "string" && c.name.trim() ? c.name.trim() : String(c.serviceName ?? "Клас");
                  const cap = Number(c.capacity);
                  const instructor = [c.instructorFirstName, c.instructorLastName]
                    .filter(Boolean)
                    .join(" ")
                    .trim();
                  let subline = "—";
                  if (Number.isFinite(cap) && cap > 0 && instructor) {
                    subline =
                      cap === 1 ? `1 място с ${instructor}` : `до ${cap} души с ${instructor}`;
                  } else if (instructor) {
                    subline = `с ${instructor}`;
                  } else if (Number.isFinite(cap) && cap > 0) {
                    subline = cap === 1 ? "1 място" : `до ${cap} души`;
                  }

                  return (
                    <li key={c.id} className="schedule-card">
                      <div className="schedule-card-time">
                        <span className="schedule-card-time-start">{formatTime(String(c.startsAt))}</span>
                        {Number.isFinite(mins) && mins > 0 && (
                          <span className="schedule-card-time-duration">{mins} мин</span>
                        )}
                      </div>
                      <div className="schedule-card-main">
                        <div className="schedule-card-text">
                          <span className="schedule-card-title">{title}</span>
                          <span className="schedule-card-sub">{subline}</span>
                          
                        </div>
                        <div className="schedule-card-actions">
                          <button
                            type="button"
                            className="primary"
                            disabled={!Number.isFinite(spots) || spots < 1}
                            onClick={() => book(c.id)}
                          >
                            Запази час
                          </button>
                        
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
