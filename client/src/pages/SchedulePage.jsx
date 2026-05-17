import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { apiRequest } from "../api/http.js";
import { joinClassWaitlist, reserveClass } from "../utils/classBooking.js";
import { alertAfterReserve } from "../utils/reservationAlerts.js";

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
  const [classes, setClasses] = useState([]);
  const [waitlistClassIds, setWaitlistClassIds] = useState(() => new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  /** @type {[null | { classId: number, action: 'reserve' | 'waitlist' }]} */
  const [busy, setBusy] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    const requests = [
      apiRequest(getToken, "/api/classes").then((j) => setClasses(j.classes ?? [])),
    ];
    if (authenticated) {
      requests.push(
        apiRequest(getToken, "/api/me/waitlist").then((j) => {
          const ids = new Set((j.waitlist ?? []).map((w) => Number(w.classId)));
          setWaitlistClassIds(ids);
        })
      );
    } else {
      setWaitlistClassIds(new Set());
    }
    return Promise.all(requests)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [authenticated, getToken]);

  useEffect(() => {
    load();
  }, [load]);

  const byDate = useMemo(() => groupClassesByDate(classes), [classes]);

  const requireLogin = () => {
    keycloak.login({ redirectUri: window.location.href });
  };

  /**
   * @param {number|string} classId
   * @param {'reserve' | 'waitlist'} action
   */
  const handleAction = (classId, action) => {
    if (!authenticated) {
      requireLogin();
      return;
    }
    setBusy({ classId: Number(classId), action });
    setError("");
    const request =
      action === "reserve" ? reserveClass(getToken, classId) : joinClassWaitlist(getToken, classId);
    request
      .then((body) => {
        if (action === "reserve") {
          alertAfterReserve(body?.status);
        } else {
          const pos = body?.position;
          window.alert(
            pos != null
              ? `Записани сте в чакащия лист. Ваша позиция: ${pos}.`
              : "Записани сте в чакащия лист."
          );
        }
        return load();
      })
      .catch((e) => {
        setError(e.message);
        window.alert(e.message || "Възникна грешка. Опитайте отново.");
      })
      .finally(() => setBusy(null));
  };

  return (
    <main className="page page--schedule">
      <h2>График на класове</h2>
      <p className="muted">Показват се предстоящи класове със свободни места или възможност за чакащ лист.</p>
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
                  const hasSpots = Number.isFinite(spots) && spots >= 1;
                  const full = !hasSpots;
                  const classId = Number(c.id);
                  const onWaitlist = waitlistClassIds.has(classId);
                  const isReserveBusy = busy?.classId === classId && busy.action === "reserve";
                  const isWaitlistBusy = busy?.classId === classId && busy.action === "waitlist";
                  const anyBusy = busy != null;
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
                          {Number.isFinite(spots) && (
                            <span className="schedule-card-sub">
                              {full ? "Пълен клас" : `${spots} свободни места`}
                            </span>
                          )}
                          {full && onWaitlist && (
                            <span className="schedule-card-sub">Вече сте в чакащия лист</span>
                          )}
                        </div>
                        <div className="schedule-card-actions">
                          {hasSpots ? (
                            <button
                              type="button"
                              className="primary"
                              disabled={anyBusy}
                              onClick={() => handleAction(classId, "reserve")}
                            >
                              {isReserveBusy ? "…" : authenticated ? "Запази място" : "Вход — запази място"}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="waitlist"
                              disabled={onWaitlist || anyBusy}
                              onClick={() => handleAction(classId, "waitlist")}
                            >
                              {isWaitlistBusy
                                ? "…"
                                : onWaitlist
                                  ? "В чакащия лист"
                                  : authenticated
                                    ? "Запиши в чакащ лист"
                                    : "Вход — чакащ лист"}
                            </button>
                          )}
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
