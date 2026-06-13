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
  canClientCancelBeforeClass,
  CLIENT_CANCEL_TOO_LATE_MESSAGE,
} from "../utils/cancellationPolicy.js";
import {
  alertAfterReserve,
  alertError,
  alertMessage,
  confirmCancelReservation,
  confirmReserve,
  confirmWaitlistJoin,
} from "../utils/reservationAlerts.js";
import { RESERVATION_STATUS_BG } from "../utils/reservationStatusBg.js";
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

const MY_STATUS_LABELS = {
  ...RESERVATION_STATUS_BG,
  cancelled_by_user: "Анулирана от вас",
};

const TAB_LABELS = {
  upcoming: "Предстоящи",
  waitlist: "Списък за чакане",
  past: "Минали",
};

const SECTION_HEADINGS = {
  upcoming: "Предстоящи резервации",
  waitlist: "Списък за чакане",
  past: "Минали резервации",
};

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

/** @param {number | null} studioId */
function matchesStudio(row, studioId) {
  return studioId != null && Number(row.studioId) === studioId;
}

export default function MyBookingsPage() {
  const { authenticated, getToken, keycloak } = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedClassId = searchParams.get("classId");
  const [studios, setStudios] = useState([]);
  const [studiosLoading, setStudiosLoading] = useState(true);
  const [selectedStudioId, setSelectedStudioId] = useState(null);
  const [rows, setRows] = useState([]);
  const [waitlistRows, setWaitlistRows] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [appUser, setAppUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(null);
  const [leavingWaitlist, setLeavingWaitlist] = useState(null);
  /** @type {[null | 'reserve' | 'waitlist']} */
  const [bookingAction, setBookingAction] = useState(null);
  const [listTab, setListTab] = useState("upcoming");

  const applyStudioSelection = useCallback(
    (id) => {
      setSelectedStudioId(id);
      try {
        sessionStorage.setItem(STUDIO_STORAGE_KEY, String(id));
      } catch {
        /* ignore */
      }
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("studioId", String(id));
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  useEffect(() => {
    let cancelled = false;
    setStudiosLoading(true);
    apiRequest(getToken, "/api/studios")
      .then((j) => {
        if (cancelled) return;
        const list = j.studios ?? [];
        setStudios(list);
        const initial = resolveInitialStudioId(list, searchParams);
        if (initial != null) setSelectedStudioId(initial);
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
    // Resolve from URL/session only on initial studio load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getToken]);

  const load = () => {
    setLoading(true);
    setError("");
    const requests = [];

    if (authenticated) {
      requests.push(
        apiRequest(getToken, "/api/me").then((j) => {
          setAppUser(j.appUser ?? null);
        }),
      );
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
      setAppUser(null);
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

  const studioReservations = useMemo(
    () => rows.filter((r) => matchesStudio(r, selectedStudioId)),
    [rows, selectedStudioId],
  );

  const studioWaitlist = useMemo(
    () => waitlistRows.filter((w) => matchesStudio(w, selectedStudioId)),
    [waitlistRows, selectedStudioId],
  );

  const { upcoming, past } = useMemo(() => {
    const today = startOfToday();
    const grouped = studioReservations.reduce(
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
  }, [studioReservations]);

  const activeListRows =
    listTab === "upcoming"
      ? upcoming
      : listTab === "past"
        ? past
        : studioWaitlist;

  const cancel = async (id) => {
    if (!authenticated) {
      keycloak.login({ redirectUri: window.location.href });
      return;
    }
    const cancelReason = await confirmCancelReservation();
    if (cancelReason === null) return;

    setCancelling(id);
    setError("");
    apiRequest(getToken, `/api/reservations/${id}/cancel`, {
      method: "PATCH",
      body: JSON.stringify({
        cancelReason: cancelReason.trim() || null,
      }),
    })
      .then(() => load())
      .catch((e) => setError(e.message))
      .finally(() => setCancelling(null));
  };

  const login = () => keycloak.login({ redirectUri: window.location.href });
  const bookingBlocked = authenticated && isOnlineBookingBlocked(appUser);

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
    if (bookingBlocked) {
      setError(ONLINE_BOOKING_BLOCKED_MESSAGE);
      alertError(ONLINE_BOOKING_BLOCKED_MESSAGE);
      return;
    }
    const spots = Number(selectedClass.spotsLeft);
    const hasSpots = Number.isFinite(spots) && spots >= 1;
    if (action === "reserve" && !hasSpots) return;
    if (action === "waitlist" && hasSpots) return;
    if (
      action === "reserve" &&
      !canClientBookBeforeClass(selectedClass.startsAt)
    ) {
      setError(CLIENT_BOOKING_TOO_LATE_MESSAGE);
      alertError(CLIENT_BOOKING_TOO_LATE_MESSAGE);
      return;
    }

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
  const selectedBookingAllowed = selectedClass
    ? canClientBookBeforeClass(selectedClass.startsAt)
    : false;

  const selectedStudio = useMemo(
    () => studios.find((s) => Number(s.id) === selectedStudioId) ?? null,
    [studios, selectedStudioId],
  );

  const pickerOpen =
    !studiosLoading && studios.length > 1 && selectedStudioId == null;

  const listByDate = useMemo(
    () => groupRowsByDate(activeListRows),
    [activeListRows],
  );

  const subtitle =
    selectedStudio && studios.length > 1
      ? `Резервации за ${String(selectedStudio.name ?? "").trim()}`
      : "Предстоящи и минали резервации, както и позиции в списъци за чакане.";

  return (
    <main className="page page--schedule">
      <h2>Мои резервации</h2>
      {studios.length > 1 && selectedStudioId != null && (
        <div className="schedule-studio-bar">
          <label htmlFor="bookings-studio-select">Студио</label>
          <select
            id="bookings-studio-select"
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
      {studiosLoading || loading ? (
        <p>Зареждане…</p>
      ) : studios.length === 0 ? (
        <p className="muted">Няма активни студиа.</p>
      ) : pickerOpen ? null : (
        <>
          {selectedClassId && (
            <section className="bookings-section">
              <h3 className="bookings-section-heading">Избран час</h3>
              {selectedClass ? (
                <ul className="schedule-card-list">
                  <ScheduleClassCard
                    row={selectedClass}
                    notes={[
                      ...(selectedClass.studioName
                        ? [String(selectedClass.studioName)]
                        : []),
                      ...(selectedHasSpots &&
                      !selectedAlreadyBooked &&
                      !selectedBookingAllowed
                        ? [CLIENT_BOOKING_TOO_LATE_MESSAGE]
                        : []),
                      ...(bookingBlocked ? [ONLINE_BOOKING_BLOCKED_MESSAGE] : []),
                    ]}
                    footer={
                      <>
                        <ScheduleCapacityBadge
                          capacity={Number(selectedClass.capacity)}
                          spotsLeft={selectedSpots}
                        />
                        {selectedHasSpots || selectedAlreadyBooked ? (
                          <button
                            type="button"
                            className="primary schedule-card-book-btn"
                            disabled={
                              selectedAlreadyBooked ||
                              bookingBlocked ||
                              !selectedBookingAllowed ||
                              bookingAction != null
                            }
                            title={
                              !selectedBookingAllowed && !selectedAlreadyBooked
                                ? CLIENT_BOOKING_TOO_LATE_MESSAGE
                                : undefined
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
                              selectedOnWaitlist ||
                              bookingAction != null ||
                              bookingBlocked
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
                      </>
                    }
                  />
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
              <div
                className="btn-group"
                role="group"
                aria-label="Секции на резервации"
              >
                {(["upcoming", "waitlist", "past"]).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    className={listTab === tab ? "is-active" : ""}
                    onClick={() => setListTab(tab)}
                  >
                    {TAB_LABELS[tab]}
                  </button>
                ))}
              </div>

              <section
                className="bookings-section"
                aria-labelledby="reservations-list-heading"
              >
                <h3
                  id="reservations-list-heading"
                  className="bookings-section-heading"
                >
                  {SECTION_HEADINGS[listTab]}
                </h3>
                {activeListRows.length === 0 ? (
                  <p className="muted">Няма записи в тази секция.</p>
                ) : (
                  <div className="schedule-by-day">
                    {listByDate.map(([dateKey, dayRows]) => (
                      <section
                        key={dateKey}
                        className="schedule-day"
                        aria-labelledby={`list-day-${listTab}-${dateKey}`}
                      >
                        <h4
                          id={`list-day-${listTab}-${dateKey}`}
                          className="schedule-day-heading"
                        >
                          {formatDayHeading(String(dayRows[0].classStartsAt))}
                        </h4>
                        <div className="schedule-day-line" aria-hidden />
                        <ul className="schedule-card-list">
                          {dayRows.map((row) => {
                            if (listTab === "waitlist") {
                              const notes = [];
                              if (row.position != null) {
                                notes.push(
                                  `Позиция в списъка: ${row.position}`,
                                );
                              }
                              return (
                                <ScheduleClassCard
                                  key={String(row.id)}
                                  row={row}
                                  notes={notes}
                                  footer={
                                    <button
                                      type="button"
                                      className="danger schedule-card-book-btn"
                                      disabled={leavingWaitlist === row.classId}
                                      onClick={() => leaveWaitlist(row.classId)}
                                    >
                                      {leavingWaitlist === row.classId
                                        ? "…"
                                        : "Напусни списъка"}
                                    </button>
                                  }
                                />
                              );
                            }

                            const statusLabel =
                              MY_STATUS_LABELS[row.status] ??
                              String(row.status ?? "—");
                            const showCancelBtn = canCancelStatus(row.status);
                            const cancelAllowed = canClientCancelBeforeClass(
                              row.classStartsAt,
                            );
                            const notes = [statusLabel];
                            if (showCancelBtn && !cancelAllowed) {
                              notes.push(CLIENT_CANCEL_TOO_LATE_MESSAGE);
                            }
                            return (
                              <ScheduleClassCard
                                key={String(row.id)}
                                row={row}
                                notes={notes}
                                footer={
                                  showCancelBtn ? (
                                    <button
                                      type="button"
                                      className="danger schedule-card-book-btn"
                                      disabled={
                                        cancelling === row.id || !cancelAllowed
                                      }
                                      title={
                                        !cancelAllowed
                                          ? CLIENT_CANCEL_TOO_LATE_MESSAGE
                                          : undefined
                                      }
                                      onClick={() => cancel(row.id)}
                                    >
                                      {cancelling === row.id ? "…" : "Анулирай"}
                                    </button>
                                  ) : (
                                    <span className="schedule-card-note">
                                      {statusLabel}
                                    </span>
                                  )
                                }
                              />
                            );
                          })}
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

      {pickerOpen && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bookings-studio-picker-title"
        >
          <div className="panel modal-card">
            <h4 id="bookings-studio-picker-title">Изберете студио</h4>
            <p className="muted">
              Изберете локация, за да видите резервациите и списъците за
              чакане за това студио.
            </p>
            <ul className="studio-picker-list">
              {studios.map((s) => {
                const detail = studioDetailLine(s);
                return (
                  <li key={String(s.id)}>
                    <button
                      type="button"
                      className="primary studio-picker-btn"
                      onClick={() => applyStudioSelection(Number(s.id))}
                    >
                      <span className="studio-picker-btn-name">
                        {String(s.name ?? "").trim()}
                      </span>
                      {detail ? (
                        <span className="studio-picker-btn-detail">
                          {detail}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </main>
  );
}

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
  if (!Number.isFinite(capacity) || capacity <= 0 || !Number.isFinite(spotsLeft)) {
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
  if (typeof row.instructorPhotoUrl === "string" && row.instructorPhotoUrl.trim()) {
    return row.instructorPhotoUrl.trim();
  }
  if (typeof row.instructorImageUrl === "string" && row.instructorImageUrl.trim()) {
    return row.instructorImageUrl.trim();
  }
  return null;
}

/**
 * @param {{
 *   row: Record<string, unknown>,
 *   notes?: string[],
 *   footer: import("react").ReactNode,
 * }} props
 */
function ScheduleClassCard({ row, notes = [], footer }) {
  const title = classTitleFromRow(row);
  const timeRange = formatTimeRange(row);
  const instructorName = instructorNameFromRow(row);
  const initials = instructorInitialsFromRow(row);
  const photoUrl = instructorPhotoUrlFromRow(row);

  return (
    <li className="schedule-card">
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
            <span className="schedule-card-avatar" aria-hidden="true">
              {initials}
            </span>
          )}
          <span className="schedule-card-instructor-name" title={instructorName}>
            {instructorName || "—"}
          </span>
        </div>
        <div className="schedule-card-end">{footer}</div>
      </div>
    </li>
  );
}
