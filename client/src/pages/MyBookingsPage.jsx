import { useEffect, useMemo, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { apiRequest } from "../api/http.js";
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

export default function MyBookingsPage() {
  const { authenticated, getToken, keycloak } = useOutletContext();
  const [searchParams] = useSearchParams();
  const selectedClassId = searchParams.get("classId");
  const [rows, setRows] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(null);
  const [booking, setBooking] = useState(false);
  const [reservationListTab, setReservationListTab] = useState("upcoming");

  const load = () => {
    setLoading(true);
    setError("");
    const requests = [];

    if (authenticated) {
      requests.push(apiRequest(getToken, "/api/me/reservations").then((j) => setRows(j.reservations ?? [])));
    } else {
      setRows([]);
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

  const reserveSelectedClass = () => {
    if (!authenticated) {
      login();
      return;
    }
    if (!selectedClass) return;
    setBooking(true);
    setError("");
    apiRequest(getToken, `/api/classes/${selectedClass.id}/reservations`, { method: "POST" })
      .then(() => {
        window.alert("Резервацията е създадена успешно.");
        return load();
      })
      .catch((e) => setError(e.message))
      .finally(() => setBooking(false));
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
                  <button
                    type="button"
                    className="primary"
                    disabled={booking || Number(selectedClass.spotsLeft) < 1}
                    onClick={reserveSelectedClass}
                  >
                    {booking ? "…" : authenticated ? "Потвърди резервация" : "Вход за резервация"}
                  </button>
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
          )}
        </>
      )}
    </main>
  );
}
