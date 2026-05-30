import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { apiRequest } from "../../api/http.js";
import WeeklyClassesCalendar from "../../components/admin/WeeklyClassesCalendar.jsx";
import {
  classTitleFromRow,
  formatTimeRange,
} from "../../utils/scheduleDisplay.js";

const ACTIVE_RESERVATION_STATUSES = new Set([
  "pending",
  "confirmed",
  "pending_confirmation",
]);
const MODAL_STATUSES = [
  { value: "pending", label: "pending" },
  { value: "confirmed", label: "confirmed" },
  { value: "no_show", label: "no show" },
  { value: "cancelled", label: "cancelled" },
];

async function loadAllAdminReservations(getToken) {
  const limit = 100;
  const reservations = [];

  for (let offset = 0; offset < 2000; offset += limit) {
    const body = await apiRequest(
      getToken,
      `/api/admin/reservations?limit=${limit}&offset=${offset}`,
    );
    const page = body.reservations ?? [];
    reservations.push(...page);
    if (page.length < limit) break;
  }

  return reservations;
}

function mergeReservationCounts(classes, reservations) {
  const counts = new Map();

  for (const reservation of reservations) {
    if (!ACTIVE_RESERVATION_STATUSES.has(String(reservation.status))) continue;
    const classId = Number(reservation.classId);
    if (!Number.isInteger(classId)) continue;
    counts.set(classId, (counts.get(classId) ?? 0) + 1);
  }

  return classes.map((row) => {
    const classId = Number(row.id);
    const counted = counts.get(classId) ?? 0;
    const capacity = Number(row.capacity);
    return {
      ...row,
      taken: counted,
      spotsLeft: Number.isFinite(capacity) ? capacity - counted : row.spotsLeft,
    };
  });
}

export default function ClassesCalendarAdminPage() {
  const { getToken } = useOutletContext();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalClass, setModalClass] = useState(null);
  const [modalReservations, setModalReservations] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");
  const [busyReservationId, setBusyReservationId] = useState(null);

  const refreshClasses = () =>
    Promise.all([
      apiRequest(getToken, "/api/admin/classes"),
      loadAllAdminReservations(getToken),
    ]).then(([classesBody, reservations]) =>
      setClasses(
        mergeReservationCounts(classesBody.classes ?? [], reservations),
      ),
    );

  const loadClassReservations = (classId) => {
    setModalLoading(true);
    setModalError("");
    const q = new URLSearchParams({ classId: String(classId), limit: "100" });
    return apiRequest(getToken, `/api/admin/reservations?${q}`)
      .then((body) => setModalReservations(body.reservations ?? []))
      .catch((err) => setModalError(err.message))
      .finally(() => setModalLoading(false));
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    refreshClasses()
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [getToken]);

  const openReservationsModal = (row) => {
    setModalClass(row);
    setModalReservations([]);
    loadClassReservations(row.id);
  };

  const closeReservationsModal = () => {
    setModalClass(null);
    setModalReservations([]);
    setModalError("");
  };

  const currentModalStatus = (status) =>
    status === "cancelled_by_user" || status === "cancelled_by_admin"
      ? "cancelled"
      : status;

  const updateReservationStatus = (reservationId, status) => {
    if (!modalClass) return;
    setBusyReservationId(reservationId);
    setModalError("");
    apiRequest(getToken, `/api/admin/reservations/${reservationId}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    })
      .then(() => {
        return Promise.all([
          loadClassReservations(modalClass.id),
          refreshClasses(),
        ]);
      })
      .catch((err) => setModalError(err.message))
      .finally(() => setBusyReservationId(null));
  };

  return (
    <>
      {error && <div className="error-banner">{error}</div>}
      {loading ? (
        <p>Зареждане…</p>
      ) : (
        <WeeklyClassesCalendar
          classes={classes}
          onClassClick={openReservationsModal}
        />
      )}

      {modalClass && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="class-reservations-title"
        >
          <div className="panel modal-card week-cal-modal">
            <div className="week-cal-modal-head">
              <div>
                <h4 id="class-reservations-title">
                  {classTitleFromRow(modalClass)}
                </h4>
                <p className="muted">
                  {formatTimeRange(modalClass)} · {modalClass.studioName ?? "—"}
                </p>
              </div>
              <button type="button" onClick={closeReservationsModal}>
                Затвори
              </button>
            </div>

            {modalError && <div className="error-banner">{modalError}</div>}
            {modalLoading ? (
              <p>Зареждане…</p>
            ) : modalReservations.length === 0 ? (
              <p className="muted">Няма резервации за този час.</p>
            ) : (
              <div className="table-wrap">
                <table className="data">
                  <thead>
                    <tr>
                      <th>Клиент</th>
                      <th>Телефон</th>
                      <th>Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalReservations.map((reservation) => (
                      <tr key={reservation.id}>
                        <td>
                          {[
                            reservation.clientFirstName,
                            reservation.clientLastName,
                          ]
                            .filter(Boolean)
                            .join(" ") || "—"}
                        </td>
                        <td>{reservation.clientPhone || "—"}</td>
                        <td>
                          <select
                            value={currentModalStatus(reservation.status)}
                            disabled={busyReservationId === reservation.id}
                            onChange={(e) =>
                              updateReservationStatus(
                                reservation.id,
                                e.target.value,
                              )
                            }
                          >
                            {MODAL_STATUSES.map((status) => (
                              <option key={status.value} value={status.value}>
                                {status.label}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
