import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { apiRequest } from "../api/http.js";
import {
  canClientBookBeforeClass,
  CLIENT_BOOKING_TOO_LATE_MESSAGE,
} from "../utils/bookingPolicy.js";
import { joinClassWaitlist, reserveClass } from "../utils/classBooking.js";
import { activeBookedClassIds } from "../utils/bookingState.js";
import {
  isOnlineBookingBlocked,
  ONLINE_BOOKING_BLOCKED_MESSAGE,
} from "../utils/bookingBlock.js";
import {
  alertAfterReserve,
  alertError,
  alertMessage,
  confirmReserve,
  confirmWaitlistJoin,
} from "../utils/reservationAlerts.js";
import {
  classTitleFromRow,
  formatDayHeading,
  formatTimeRange,
  groupRowsByDate,
  instructorInitialsFromRow,
  instructorNameFromRow,
} from "../utils/scheduleDisplay.js";
import {
  resolveInitialStudioId,
  STUDIO_STORAGE_KEY,
  studioDetailLine,
  studioOptionLabel,
} from "../utils/studioSelection.js";

function PersonIcon() {
  return (
    <svg
      className="schedule-card-capacity-icon"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 640 640"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M240 192C240 147.8 275.8 112 320 112C364.2 112 400 147.8 400 192C400 236.2 364.2 272 320 272C275.8 272 240 236.2 240 192zM448 192C448 121.3 390.7 64 320 64C249.3 64 192 121.3 192 192C192 262.7 249.3 320 320 320C390.7 320 448 262.7 448 192zM144 544C144 473.3 201.3 416 272 416L368 416C438.7 416 496 473.3 496 544L496 552C496 565.3 506.7 576 520 576C533.3 576 544 565.3 544 552L544 544C544 446.8 465.2 368 368 368L272 368C174.8 368 96 446.8 96 544L96 552C96 565.3 106.7 576 120 576C133.3 576 144 565.3 144 552L144 544z" />
    </svg>
  );
}

/** @param {{ capacity: number, spotsLeft: number }} props */
function ScheduleCapacityBadge({ capacity, spotsLeft }) {
  if (
    !Number.isFinite(capacity) ||
    capacity <= 0 ||
    !Number.isFinite(spotsLeft)
  ) {
    return null;
  }
  const full = spotsLeft < 1;
  const reserved = Math.min(capacity, Math.max(0, capacity - spotsLeft));
  return (
    <span
      className={`schedule-card-capacity${full ? " schedule-card-capacity--full" : ""}`}
      aria-label={`${reserved} от ${capacity} запазени места`}
    >
      <PersonIcon />
      <span className="schedule-card-capacity-text">
        {reserved}/{capacity}
      </span>
    </span>
  );
}

/** @param {Record<string, unknown>} row */
function instructorPhotoUrlFromRow(row) {
  if (
    typeof row.instructorPhotoUrl === "string" &&
    row.instructorPhotoUrl.trim()
  ) {
    return row.instructorPhotoUrl.trim();
  }
  if (
    typeof row.instructorImageUrl === "string" &&
    row.instructorImageUrl.trim()
  ) {
    return row.instructorImageUrl.trim();
  }
  return null;
}

export default function SchedulePage() {
  const { authenticated, getToken, keycloak } = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [studios, setStudios] = useState([]);
  const [studiosLoading, setStudiosLoading] = useState(true);
  const [selectedStudioId, setSelectedStudioId] = useState(null);
  const [classes, setClasses] = useState([]);
  const [waitlistClassIds, setWaitlistClassIds] = useState(() => new Set());
  const [bookedClassIds, setBookedClassIds] = useState(() => new Set());
  const [appUser, setAppUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  /** @type {[null | { classId: number, action: 'reserve' | 'waitlist' }]} */
  const [busy, setBusy] = useState(null);

  const applyStudioSelection = useCallback(
    (id) => {
      setSelectedStudioId(id);
      // Save to sessionStorage only if authenticated
      if (authenticated) {
        try {
          sessionStorage.setItem(STUDIO_STORAGE_KEY, String(id));
        } catch {
          /* ignore */
        }
      }
      setSearchParams({ studioId: String(id) }, { replace: true });
    },
    [setSearchParams, authenticated],
  );

  useEffect(() => {
    let cancelled = false;
    setStudiosLoading(true);
    setError("");
    apiRequest(getToken, "/api/studios")
      .then((j) => {
        if (cancelled) return;
        const list = j.studios ?? [];
        setStudios(list);
        // For guests, always show picker (set to null)
        // For authenticated users, load from sessionStorage/URL
        if (authenticated) {
          setSelectedStudioId(resolveInitialStudioId(list, searchParams));
        } else {
          setSelectedStudioId(null);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setStudiosLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // Show picker for guests, load stored selection for authenticated users
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getToken, authenticated]);

  const load = useCallback(() => {
    if (selectedStudioId == null) {
      setClasses([]);
      setWaitlistClassIds(new Set());
      setBookedClassIds(new Set());
      setLoading(false);
      return Promise.resolve();
    }
    setLoading(true);
    setError("");
    const requests = [
      apiRequest(getToken, `/api/classes?studioId=${selectedStudioId}`).then(
        (j) => setClasses(j.classes ?? []),
      ),
    ];
    if (authenticated) {
      requests.push(
        apiRequest(getToken, "/api/me").then((j) => {
          setAppUser(j.appUser ?? null);
        }),
      );
      requests.push(
        apiRequest(getToken, "/api/me/waitlist").then((j) => {
          const ids = new Set((j.waitlist ?? []).map((w) => Number(w.classId)));
          setWaitlistClassIds(ids);
        }),
      );
      requests.push(
        apiRequest(getToken, "/api/me/reservations").then((j) => {
          setBookedClassIds(activeBookedClassIds(j.reservations ?? []));
        }),
      );
    } else {
      setWaitlistClassIds(new Set());
      setBookedClassIds(new Set());
      setAppUser(null);
    }
    return Promise.all(requests)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [authenticated, getToken, selectedStudioId]);

  useEffect(() => {
    if (!studiosLoading) load();
  }, [load, studiosLoading]);

  const byDate = useMemo(() => groupRowsByDate(classes, "startsAt"), [classes]);

  const selectedStudio = useMemo(
    () => studios.find((s) => Number(s.id) === selectedStudioId) ?? null,
    [studios, selectedStudioId],
  );

  const pickerOpen =
    !studiosLoading && studios.length > 1 && selectedStudioId == null;

  const requireLogin = () => {
    keycloak.login({ redirectUri: window.location.href });
  };

  const bookingBlocked = authenticated && isOnlineBookingBlocked(appUser);

  /**
   * @param {number|string} classId
   * @param {'reserve' | 'waitlist'} action
   */
  const handleAction = async (classId, action) => {
    if (!authenticated) {
      requireLogin();
      return;
    }
    if (bookingBlocked) {
      setError(ONLINE_BOOKING_BLOCKED_MESSAGE);
      alertError(ONLINE_BOOKING_BLOCKED_MESSAGE);
      return;
    }
    if (action === "reserve") {
      const cls = classes.find((c) => Number(c.id) === Number(classId));
      if (cls && !canClientBookBeforeClass(cls.startsAt)) {
        setError(CLIENT_BOOKING_TOO_LATE_MESSAGE);
        alertError(CLIENT_BOOKING_TOO_LATE_MESSAGE);
        return;
      }
    }
    const confirmed =
      action === "reserve"
        ? await confirmReserve()
        : await confirmWaitlistJoin();
    if (!confirmed) return;

    setBusy({ classId: Number(classId), action });
    setError("");
    const request =
      action === "reserve"
        ? reserveClass(getToken, classId)
        : joinClassWaitlist(getToken, classId);
    request
      .then((body) => {
        if (action === "reserve") {
          return alertAfterReserve(body?.status).then(() => load());
        }
        const pos = body?.position;
        return alertMessage(
          pos != null
            ? `Записани сте в листа за чакащи. Ваша позиция: ${pos}.`
            : "Записани сте в листа за чакащи.",
          "Списък за чакане",
        ).then(() => load());
      })
      .catch((e) => {
        setError(e.message);
        alertError(e.message);
      })
      .finally(() => setBusy(null));
  };

  const subtitle =
    selectedStudio && studios.length > 1
      ? `График — ${String(selectedStudio.name ?? "").trim()}`
      : "Показват се предстоящи класове със свободни места или възможност за чакащ лист.";

  return (
    <main className="page page--schedule">
      <h2>График на класове</h2>
      {studios.length > 1 && selectedStudioId != null && (
        <div className="schedule-studio-bar">
          <label htmlFor="schedule-studio-select">Студио</label>
          <select
            id="schedule-studio-select"
            value={String(selectedStudioId)}
            onChange={(e) => applyStudioSelection(Number(e.target.value))}
          >
            {studios.map((s) => (
              <option key={String(s.id)} value={String(s.id)}>
                {studioOptionLabel(s)}
              </option>
            ))}
          </select>
        </div>
      )}
      <p className="muted">{subtitle}</p>
      {bookingBlocked && (
        <div className="error-banner">{ONLINE_BOOKING_BLOCKED_MESSAGE}</div>
      )}
      {error && <div className="error-banner">{error}</div>}

      {studiosLoading ? (
        <p>Зареждане…</p>
      ) : studios.length === 0 ? (
        <p className="muted">
          Няма активни студиа. Добавете студио от админ панела или стартирайте
          seed скрипта.
        </p>
      ) : pickerOpen ? null : loading ? (
        <p>Зареждане…</p>
      ) : classes.length === 0 ? (
        <p className="muted">
          Няма предстоящи класове за това студио. Добавете данни от админ панела
          или стартирайте seed скрипта.
        </p>
      ) : (
        <div className="schedule-by-day">
          {byDate.map(([dateKey, dayClasses]) => (
            <section
              key={dateKey}
              className="schedule-day"
              aria-labelledby={`schedule-heading-${dateKey}`}
            >
              <h3
                id={`schedule-heading-${dateKey}`}
                className="schedule-day-heading"
              >
                {formatDayHeading(String(dayClasses[0].startsAt))}
              </h3>
              <div className="schedule-day-line" aria-hidden />
              <ul className="schedule-card-list">
                {dayClasses.map((c) => {
                  const spots = Number(c.spotsLeft);
                  const hasSpots = Number.isFinite(spots) && spots >= 1;
                  const classId = Number(c.id);
                  const onWaitlist = waitlistClassIds.has(classId);
                  const alreadyBooked = bookedClassIds.has(classId);
                  const bookingAllowed = canClientBookBeforeClass(c.startsAt);
                  const isReserveBusy =
                    busy?.classId === classId && busy.action === "reserve";
                  const isWaitlistBusy =
                    busy?.classId === classId && busy.action === "waitlist";
                  const anyBusy = busy != null;
                  const cap = Number(c.capacity);
                  const notes = [];
                  if (alreadyBooked) {
                    notes.push("Вече имате резервация за този час");
                  } else if (hasSpots && !bookingAllowed) {
                    notes.push(CLIENT_BOOKING_TOO_LATE_MESSAGE);
                  } else if (bookingBlocked) {
                    notes.push(ONLINE_BOOKING_BLOCKED_MESSAGE);
                  } else if (!hasSpots && onWaitlist) {
                    notes.push("Вече сте в листа за чакащи");
                  }

                  const title = classTitleFromRow(c);
                  const timeRange = formatTimeRange(c);
                  const instructorName = instructorNameFromRow(c);
                  const initials = instructorInitialsFromRow(c);
                  const photoUrl = instructorPhotoUrlFromRow(c);

                  return (
                    <li key={c.id} className="schedule-card">
                      <div className="schedule-card-inner">
                        <p className="schedule-card-time-range">{timeRange}</p>
                        <div className="schedule-card-rule" aria-hidden />
                        <div className="schedule-card-info">
                          <h4 className="schedule-card-title">{title}</h4>
                          {notes.map((note) => (
                            <p key={note} className="schedule-card-subtitle">
                              {note}
                            </p>
                          ))}
                        </div>
                        <div className="schedule-card-instructor">
                          {photoUrl ? (
                            <img
                              src={photoUrl}
                              alt=""
                              className="schedule-card-avatar schedule-card-avatar--photo"
                            />
                          ) : (
                            <span
                              className="schedule-card-avatar"
                              aria-hidden="true"
                            >
                              {initials}
                            </span>
                          )}
                          <span
                            className="schedule-card-instructor-name"
                            title={instructorName}
                          >
                            {instructorName || "—"}
                          </span>
                        </div>
                        <div className="schedule-card-end">
                          <ScheduleCapacityBadge
                            capacity={cap}
                            spotsLeft={spots}
                          />
                          {hasSpots || alreadyBooked ? (
                            <button
                              type="button"
                              className="primary schedule-card-book-btn"
                              disabled={
                                alreadyBooked ||
                                bookingBlocked ||
                                !bookingAllowed ||
                                anyBusy ||
                                isReserveBusy
                              }
                              title={
                                !bookingAllowed && !alreadyBooked
                                  ? CLIENT_BOOKING_TOO_LATE_MESSAGE
                                  : undefined
                              }
                              onClick={() => handleAction(classId, "reserve")}
                            >
                              {isReserveBusy
                                ? "…"
                                : alreadyBooked
                                  ? "Резервирано"
                                  : "Запази място"}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="waitlist schedule-card-book-btn"
                              disabled={
                                bookingBlocked ||
                                onWaitlist ||
                                anyBusy ||
                                isWaitlistBusy
                              }
                              onClick={() => handleAction(classId, "waitlist")}
                            >
                              {isWaitlistBusy
                                ? "…"
                                : onWaitlist
                                  ? "В списъка на чакащи"
                                  : "Запази в чакащи"}
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

      {pickerOpen && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="studio-picker-title"
        >
          <div className="studio-picker-modal">
            <div className="studio-picker-header">
              <div className="studio-picker-icon">
                <i className="fa-solid fa-location-dot"></i>
              </div>

              <h2 id="studio-picker-title">Избери студио</h2>

              <p>Моля, избери студио, за да продължиш с резервацията.</p>
            </div>

            <div className="studio-picker-cards">
              {studios.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="studio-card"
                  onClick={() => applyStudioSelection(Number(s.id))}
                >
                  <img
                    src={s.imageUrl || "/src/img/project Plovdiv.jpg"}
                    alt={s.name}
                    className="studio-card-image"
                  />

                  <div className="studio-card-content">
                    <h3>{s.name}</h3>
                    <p className="studio-address">{s.address}</p>
                    <p className="studio-address">{s.city}</p>
                  </div>

                  <div className="studio-card-arrow">
                    <i className="fa-solid fa-chevron-right"></i>
                  </div>
                </button>
              ))}
            </div>

            <button
              type="button"
              className="studio-picker-cancel"
              onClick={() => setPickerOpen(false)}
            >
              Откажи
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
