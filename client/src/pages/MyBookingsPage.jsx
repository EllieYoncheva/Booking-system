import { useEffect, useMemo, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { apiRequest } from "../api/http.js";
import { joinClassWaitlist, reserveClass } from "../utils/classBooking.js";
import { alertAfterReserve } from "../utils/reservationAlerts.js";
import { RESERVATION_STATUS_BG } from "../utils/reservationStatusBg.js";

const MY_STATUS_LABELS = {
  ...RESERVATION_STATUS_BG,
  cancelled_by_user: "Анулирана от вас",
};

function formatWhen(iso) {
  try {
    return new Date(iso).toLocaleString("bg-BG", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return String(iso);
  }
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

function ReservationTable({ rows, cancelling, canCancel, cancel }) {
  if (rows.length === 0) {
    return <p className="muted">Няма резервации в тази секция.</p>;
  }

  return (
    <div className="panel table-wrap">
      <table className="data">
        <thead>
          <tr>
            <th>Клас</th>
            <th>Кога</th>
            <th>Студио</th>
            <th>Статус</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.className || r.serviceName || "—"}</td>
              <td>
                {formatWhen(r.classStartsAt)} – {formatWhen(r.classEndsAt)}
              </td>
              <td>{r.studioName}</td>
              <td>{MY_STATUS_LABELS[r.status] ?? r.status}</td>
              <td>
                {canCancel(r.status) && (
                  <button
                    type="button"
                    className="danger"
                    disabled={cancelling === r.id}
                    onClick={() => cancel(r.id)}
                  >
                    {cancelling === r.id ? "…" : "Анулирай"}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WaitlistTable({ rows, leaving, leave }) {
  if (rows.length === 0) {
    return <p className="muted">Няма активни позиции в списъци за чакане.</p>;
  }

  return (
    <div className="panel table-wrap">
      <table className="data">
        <thead>
          <tr>
            <th>Клас</th>
            <th>Кога</th>
            <th>Студио</th>
            <th>Позиция</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((w) => (
            <tr key={w.id}>
              <td>{w.className || w.serviceName || "—"}</td>
              <td>
                {formatWhen(w.classStartsAt)} – {formatWhen(w.classEndsAt)}
              </td>
              <td>{w.studioName}</td>
              <td>{w.position != null ? `${w.position}` : "—"}</td>
              <td>
                <button
                  type="button"
                  className="danger"
                  disabled={leaving === w.classId}
                  onClick={() => leave(w.classId)}
                >
                  {leaving === w.classId ? "…" : "Напусни списъка"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
      requests.push(apiRequest(getToken, "/api/me/reservations").then((j) => setRows(j.reservations ?? [])));
      requests.push(apiRequest(getToken, "/api/me/waitlist").then((j) => setWaitlistRows(j.waitlist ?? [])));
    } else {
      setRows([]);
      setWaitlistRows([]);
    }

    if (selectedClassId) {
      requests.push(
        apiRequest(getToken, "/api/classes").then((j) => {
          const found = (j.classes ?? []).find((c) => String(c.id) === String(selectedClassId));
          setSelectedClass(found ?? null);
        })
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

  const canCancel = (s) => s === "pending" || s === "confirmed";

  const { upcoming, past } = useMemo(() => {
    const today = startOfToday();
    const grouped = rows.reduce(
      (acc, row) => {
        const startsAt = new Date(row.classStartsAt).getTime();
        if (Number.isFinite(startsAt) && startsAt < today) acc.past.push(row);
        else acc.upcoming.push(row);
        return acc;
      },
      { upcoming: [], past: [] }
    );
    grouped.upcoming.sort((a, b) => new Date(a.classStartsAt) - new Date(b.classStartsAt));
    grouped.past.sort((a, b) => new Date(b.classStartsAt) - new Date(a.classStartsAt));
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

  const handleSelectedClassAction = (action) => {
    if (!authenticated) {
      login();
      return;
    }
    if (!selectedClass) return;
    const spots = Number(selectedClass.spotsLeft);
    const hasSpots = Number.isFinite(spots) && spots >= 1;
    if (action === "reserve" && !hasSpots) return;
    if (action === "waitlist" && hasSpots) return;

    setBookingAction(action);
    setError("");
    const request =
      action === "reserve"
        ? reserveClass(getToken, selectedClass.id)
        : joinClassWaitlist(getToken, selectedClass.id);
    request
      .then((body) => {
        if (action === "reserve") {
          alertAfterReserve(body?.status);
        } else {
          const pos = body?.position;
          window.alert(
            pos != null
              ? `Добавени сте в списъка за чакане. Ваша позиция: ${pos}.`
              : "Добавени сте в списъка за чакане."
          );
        }
        return load();
      })
      .catch((e) => {
        setError(e.message);
        window.alert(e.message || "Възникна грешка. Опитайте отново.");
      })
      .finally(() => setBookingAction(null));
  };

  return (
    <main className="page">
      <h2>Резервации</h2>
      {error && <div className="error-banner">{error}</div>}
      {loading ? (
        <p>Зареждане…</p>
      ) : (
        <>
          {authenticated && (
            <div className="btn-group" role="group" aria-label="Филтър на резервации">
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
            <section className="panel">
              <h3>Избран час</h3>
              {selectedClass ? (
                <>
                  <p>
                    <strong>{selectedClass.name || selectedClass.serviceName || "Клас"}</strong>
                    <br />
                    {formatWhen(selectedClass.startsAt)} – {formatWhen(selectedClass.endsAt)}
                    {selectedClass.studioName ? `, ${selectedClass.studioName}` : ""}
                  </p>
                  <div className="schedule-card-actions" style={{ marginTop: "0.75rem" }}>
                    <button
                      type="button"
                      className="primary"
                      disabled={
                        bookingAction != null ||
                        !(Number.isFinite(Number(selectedClass.spotsLeft)) && Number(selectedClass.spotsLeft) >= 1)
                      }
                      onClick={() => handleSelectedClassAction("reserve")}
                    >
                      {bookingAction === "reserve" ? "…" : authenticated ? "Запази" : "Вход — запази"}
                    </button>
                    <button
                      type="button"
                      disabled={
                        bookingAction != null ||
                        (Number.isFinite(Number(selectedClass.spotsLeft)) && Number(selectedClass.spotsLeft) >= 1)
                      }
                      onClick={() => handleSelectedClassAction("waitlist")}
                    >
                      {bookingAction === "waitlist" ? "…" : authenticated ? "Списък на изчакване" : "Вход — изчакване"}
                    </button>
                  </div>
                </>
              ) : (
                <p className="muted">Избраният час не е намерен или вече не е наличен.</p>
              )}
            </section>
          )}

          {!authenticated ? (
            <section className="panel">
              <h3>Моите резервации</h3>
              <p className="muted">Влезте в профила си, за да видите или управлявате своите резервации.</p>
              <button type="button" onClick={login}>
                Вход
              </button>
            </section>
          ) : (
            <>
              <section className="panel" aria-labelledby="waitlist-heading">
                <h3 id="waitlist-heading">Списъци за чакане</h3>
                <WaitlistTable rows={waitlistRows} leaving={leavingWaitlist} leave={leaveWaitlist} />
              </section>

              <section aria-labelledby="reservations-tab-heading">
                <h3 id="reservations-tab-heading" className="visually-hidden">
                  {reservationListTab === "upcoming" ? "Предстоящи резервации" : "Минали резервации"}
                </h3>
                <ReservationTable
                  rows={reservationListTab === "upcoming" ? upcoming : past}
                  cancelling={cancelling}
                  canCancel={canCancel}
                  cancel={cancel}
                />
              </section>
            </>
          )}
        </>
      )}
    </main>
  );
}
