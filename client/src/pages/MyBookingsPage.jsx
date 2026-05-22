import { useEffect, useMemo, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { apiRequest } from "../api/http.js";
import { joinClassWaitlist, reserveClass } from "../utils/classBooking.js";
import { activeBookedClassIds } from "../utils/bookingState.js";
import {
  canClientCancelBeforeClass,
  CLIENT_CANCEL_TOO_LATE_MESSAGE,
} from "../utils/cancellationPolicy.js";
import {
  alertAfterReserve,
  alertError,
  alertMessage,
  confirmReserve,
  confirmWaitlistJoin,
} from "../utils/reservationAlerts.js";
import { RESERVATION_STATUS_BG } from "../utils/reservationStatusBg.js";
import {
  classTitleFromRow,
  formatDayHeading,
  formatTime,
  groupRowsByDate,
  serviceDurationMins,
} from "../utils/scheduleDisplay.js";

const MY_STATUS_LABELS = {
  ...RESERVATION_STATUS_BG,
  cancelled_by_user: "Анулирана от вас",
};

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

/**
 * @param {string} startsAt
 * @param {number | null} durationMins
 */
function BookingCardTime({ startsAt, durationMins }) {
  return (
    <div className="schedule-card-time">
      <span className="schedule-card-time-start">
        {formatTime(String(startsAt))}
      </span>
      {durationMins != null && (
        <span className="schedule-card-time-duration">{durationMins} мин</span>
      )}
    </div>
  );
}

/**
 * @param {Record<string, unknown>} row
 */
function ReservationCardContent({ row, cancelling, canCancelStatus, onCancel }) {
  const mins = serviceDurationMins(row);
  const statusLabel = MY_STATUS_LABELS[row.status] ?? String(row.status ?? "—");
  const studio = row.studioName ? String(row.studioName).trim() : "";
  const showCancelBtn = canCancelStatus(row.status);
  const cancelAllowed = canClientCancelBeforeClass(row.classStartsAt);

  return (
    <>
      <BookingCardTime startsAt={String(row.classStartsAt)} durationMins={mins} />
      <div className="schedule-card-main">
        <div className="schedule-card-text">
          <span className="schedule-card-title">{classTitleFromRow(row)}</span>
          {studio ? <span className="schedule-card-sub">{studio}</span> : null}
          <span className="schedule-card-sub schedule-card-status">
            {statusLabel}
          </span>
          {showCancelBtn && !cancelAllowed && (
            <span className="schedule-card-sub">
              {CLIENT_CANCEL_TOO_LATE_MESSAGE}
            </span>
          )}
        </div>
        <div className="schedule-card-actions">
          <div className="schedule-card-actions-row">
            {showCancelBtn ? (
              <button
                type="button"
                className="danger schedule-card-book-btn"
                disabled={cancelling === row.id || !cancelAllowed}
                title={
                  !cancelAllowed ? CLIENT_CANCEL_TOO_LATE_MESSAGE : undefined
                }
                onClick={() => onCancel(row.id)}
              >
                {cancelling === row.id ? "…" : "Анулирай"}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * @param {Record<string, unknown>} row
 */
function WaitlistCardContent({ row, leaving, onLeave }) {
  const mins = serviceDurationMins(row);
  const studio = row.studioName ? String(row.studioName).trim() : "";
  const position =
    row.position != null ? `Позиция в списъка: ${row.position}` : null;

  return (
    <>
      <BookingCardTime startsAt={String(row.classStartsAt)} durationMins={mins} />
      <div className="schedule-card-main">
        <div className="schedule-card-text">
          <span className="schedule-card-title">{classTitleFromRow(row)}</span>
          {studio ? <span className="schedule-card-sub">{studio}</span> : null}
          {position ? (
            <span className="schedule-card-sub">{position}</span>
          ) : null}
        </div>
        <div className="schedule-card-actions">
          <div className="schedule-card-actions-row">
            <button
              type="button"
              className="danger schedule-card-book-btn"
              disabled={leaving === row.classId}
              onClick={() => onLeave(row.classId)}
            >
              {leaving === row.classId ? "…" : "Напусни списъка"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default function MyBookingsPage() {
  const { authenticated, getToken, keycloak } = useOutletContext();
  const [searchParams] = useSearchParams();
  const selectedClassId = searchParams.get("classId");
  const [rows, setRows] = useState([]);
  const [waitlistRows, setWaitlistRows] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(null);
  const [leavingWaitlist, setLeavingWaitlist] = useState(null);
  /** @type {[null | 'reserve' | 'waitlist']} */
  const [bookingAction, setBookingAction] = useState(null);
  const [reservationListTab, setReservationListTab] = useState("upcoming");

  const load = () => {
    setLoading(true);
    setError("");
    const requests = [];

    if (authenticated) {
      requests.push(
        apiRequest(getToken, "/api/me/reservations").then((j) =>
          setRows(j.reservations ?? []),
        ),
      );
      requests.push(
        apiRequest(getToken, "/api/me/waitlist").then((j) =>
          setWaitlistRows(j.waitlist ?? []),
        ),
      );
    } else {
      setRows([]);
      setWaitlistRows([]);
    }

    if (selectedClassId) {
      requests.push(
        apiRequest(getToken, "/api/classes").then((j) => {
          const found = (j.classes ?? []).find(
            (c) => String(c.id) === String(selectedClassId),
          );
          setSelectedClass(found ?? null);
        }),
      );
    } else {
      setSelectedClass(null);
    }

    Promise.all(requests)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [authenticated, getToken, selectedClassId]);

  const canCancelStatus = (s) => s === "pending" || s === "confirmed";

  const bookedClassIds = useMemo(
    () => activeBookedClassIds(rows),
    [rows],
  );

  const waitlistClassIds = useMemo(
    () => new Set(waitlistRows.map((w) => Number(w.classId))),
    [waitlistRows],
  );

  const { upcoming, past } = useMemo(() => {
    const today = startOfToday();
    const grouped = rows.reduce(
      (acc, row) => {
        const startsAt = new Date(row.classStartsAt).getTime();
        if (Number.isFinite(startsAt) && startsAt < today) acc.past.push(row);
        else acc.upcoming.push(row);
        return acc;
      },
      { upcoming: [], past: [] },
    );
    grouped.upcoming.sort(
      (a, b) => new Date(a.classStartsAt) - new Date(b.classStartsAt),
    );
    grouped.past.sort(
      (a, b) => new Date(b.classStartsAt) - new Date(a.classStartsAt),
    );
    return grouped;
  }, [rows]);

  const cancel = (id) => {
    if (!authenticated) {
      keycloak.login({ redirectUri: window.location.href });
      return;
    }
    setCancelling(id);
    setError("");
    apiRequest(getToken, `/api/reservations/${id}/cancel`, { method: "PATCH" })
      .then(() => load())
      .catch((e) => setError(e.message))
      .finally(() => setCancelling(null));
  };

  const login = () => keycloak.login({ redirectUri: window.location.href });

  const leaveWaitlist = (classId) => {
    if (!authenticated) {
      keycloak.login({ redirectUri: window.location.href });
      return;
    }
    setLeavingWaitlist(classId);
    setError("");
    apiRequest(getToken, `/api/me/waitlist/${classId}`, { method: "DELETE" })
      .then(() => load())
      .catch((e) => setError(e.message))
      .finally(() => setLeavingWaitlist(null));
  };

  const handleSelectedClassAction = async (action) => {
    if (!authenticated) {
      login();
      return;
    }
    if (!selectedClass) return;
    const spots = Number(selectedClass.spotsLeft);
    const hasSpots = Number.isFinite(spots) && spots >= 1;
    if (action === "reserve" && !hasSpots) return;
    if (action === "waitlist" && hasSpots) return;

    const confirmed =
      action === "reserve" ? await confirmReserve() : await confirmWaitlistJoin();
    if (!confirmed) return;

    setBookingAction(action);
    setError("");
    const request =
      action === "reserve"
        ? reserveClass(getToken, selectedClass.id)
        : joinClassWaitlist(getToken, selectedClass.id);
    request
      .then((body) => {
        if (action === "reserve") {
          return alertAfterReserve(body?.status).then(() => load());
        }
        const pos = body?.position;
        return alertMessage(
          pos != null
            ? `Добавени сте в списъка за чакане. Ваша позиция: ${pos}.`
            : "Добавени сте в списъка за чакане.",
          "Списък за чакане",
        ).then(() => load());
      })
      .catch((e) => {
        setError(e.message);
        alertError(e.message);
      })
      .finally(() => setBookingAction(null));
  };

  const selectedSpots = Number(selectedClass?.spotsLeft);
  const selectedHasSpots =
    Number.isFinite(selectedSpots) && selectedSpots >= 1;
  const selectedClassIdNum = selectedClass ? Number(selectedClass.id) : null;
  const selectedAlreadyBooked =
    selectedClassIdNum != null && bookedClassIds.has(selectedClassIdNum);
  const selectedOnWaitlist =
    selectedClassIdNum != null && waitlistClassIds.has(selectedClassIdNum);

  const reservationRows =
    reservationListTab === "upcoming" ? upcoming : past;
  const waitlistByDate = useMemo(
    () => groupRowsByDate(waitlistRows),
    [waitlistRows],
  );
  const reservationsByDate = useMemo(
    () => groupRowsByDate(reservationRows),
    [reservationRows],
  );

  return (
    <main className="page page--schedule">
      <h2>Мои резервации</h2>
      <p className="muted">
        Предстоящи и минали резервации, както и активни позиции в списъци за
        чакане.
      </p>
      {error && <div className="error-banner">{error}</div>}
      {loading ? (
        <p>Зареждане…</p>
      ) : (
        <>
          {authenticated && (
            <div
              className="btn-group"
              role="group"
              aria-label="Филтър на резервации"
            >
              <button
                type="button"
                className={reservationListTab === "upcoming" ? "is-active" : ""}
                onClick={() => setReservationListTab("upcoming")}
              >
                Предстоящи
              </button>
              <button
                type="button"
                className={reservationListTab === "past" ? "is-active" : ""}
                onClick={() => setReservationListTab("past")}
              >
                Минали
              </button>
            </div>
          )}

          {selectedClassId && (
            <section className="bookings-section">
              <h3 className="bookings-section-heading">Избран час</h3>
              {selectedClass ? (
                <ul className="schedule-card-list">
                  <li className="schedule-card">
                    <BookingCardTime
                      startsAt={String(selectedClass.startsAt)}
                      durationMins={serviceDurationMins(selectedClass)}
                    />
                    <div className="schedule-card-main">
                      <div className="schedule-card-text">
                        <span className="schedule-card-title">
                          {classTitleFromRow(selectedClass)}
                        </span>
                        {selectedClass.studioName ? (
                          <span className="schedule-card-sub">
                            {String(selectedClass.studioName)}
                          </span>
                        ) : null}
                      </div>
                      <div className="schedule-card-actions">
                        <div className="schedule-card-actions-row">
                          {selectedHasSpots || selectedAlreadyBooked ? (
                            <button
                              type="button"
                              className="primary schedule-card-book-btn"
                              disabled={
                                selectedAlreadyBooked ||
                                bookingAction != null
                              }
                              onClick={() =>
                                handleSelectedClassAction("reserve")
                              }
                            >
                              {bookingAction === "reserve"
                                ? "…"
                                : selectedAlreadyBooked
                                  ? "Резервирано"
                                  : "Запази място"}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="waitlist schedule-card-book-btn"
                              disabled={
                                selectedOnWaitlist || bookingAction != null
                              }
                              onClick={() =>
                                handleSelectedClassAction("waitlist")
                              }
                            >
                              {bookingAction === "waitlist"
                                ? "…"
                                : selectedOnWaitlist
                                  ? "В списъка на чакащи"
                                  : "Запази в чакащи"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                </ul>
              ) : (
                <p className="muted">
                  Избраният час не е намерен или вече не е наличен.
                </p>
              )}
            </section>
          )}

          {!authenticated ? (
            <section className="bookings-section">
              <p className="muted">
                Влезте в профила си, за да видите или управлявате своите
                резервации.
              </p>
              <button type="button" className="primary" onClick={login}>
                Вход
              </button>
            </section>
          ) : (
            <>
              <section
                className="bookings-section"
                aria-labelledby="waitlist-heading"
              >
                <h3 id="waitlist-heading" className="bookings-section-heading">
                  Списъци за чакане
                </h3>
                {waitlistRows.length === 0 ? (
                  <p className="muted">
                    Няма активни позиции в списъци за чакане.
                  </p>
                ) : (
                  <div className="schedule-by-day">
                    {waitlistByDate.map(([dateKey, dayRows]) => (
                      <section
                        key={dateKey}
                        className="schedule-day"
                        aria-labelledby={`waitlist-day-${dateKey}`}
                      >
                        <h4
                          id={`waitlist-day-${dateKey}`}
                          className="schedule-day-heading"
                        >
                          {formatDayHeading(String(dayRows[0].classStartsAt))}
                        </h4>
                        <div className="schedule-day-line" aria-hidden />
                        <ul className="schedule-card-list">
                          {dayRows.map((w) => (
                            <li key={String(w.id)} className="schedule-card">
                              <WaitlistCardContent
                                row={w}
                                leaving={leavingWaitlist}
                                onLeave={leaveWaitlist}
                              />
                            </li>
                          ))}
                        </ul>
                      </section>
                    ))}
                  </div>
                )}
              </section>

              <section
                className="bookings-section"
                aria-labelledby="reservations-tab-heading"
              >
                <h3
                  id="reservations-tab-heading"
                  className="bookings-section-heading"
                >
                  {reservationListTab === "upcoming"
                    ? "Предстоящи резервации"
                    : "Минали резервации"}
                </h3>
                {reservationRows.length === 0 ? (
                  <p className="muted">Няма резервации в тази секция.</p>
                ) : (
                  <div className="schedule-by-day">
                    {reservationsByDate.map(([dateKey, dayRows]) => (
                      <section
                        key={dateKey}
                        className="schedule-day"
                        aria-labelledby={`res-day-${dateKey}`}
                      >
                        <h4
                          id={`res-day-${dateKey}`}
                          className="schedule-day-heading"
                        >
                          {formatDayHeading(String(dayRows[0].classStartsAt))}
                        </h4>
                        <div className="schedule-day-line" aria-hidden />
                        <ul className="schedule-card-list">
                          {dayRows.map((r) => (
                            <li key={String(r.id)} className="schedule-card">
                              <ReservationCardContent
                                row={r}
                                cancelling={cancelling}
                                canCancelStatus={canCancelStatus}
                                onCancel={cancel}
                              />
                            </li>
                          ))}
                        </ul>
                      </section>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </>
      )}
    </main>
  );
}
