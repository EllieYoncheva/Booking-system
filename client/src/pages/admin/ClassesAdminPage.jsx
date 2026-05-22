import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { apiRequest } from "../../api/http.js";

function toLocalInput(iso) {
  if (!iso) return "";
  const x = new Date(iso);
  if (Number.isNaN(x.getTime())) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}T${p(x.getHours())}:${p(x.getMinutes())}`;
}

function fromLocalInput(local) {
  if (!local) return "";
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

function formatWhen(iso) {
  try {
    return new Date(iso).toLocaleString("bg-BG", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return String(iso);
  }
}

function toDateInput(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function toTimeInput(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

function formatServiceOption(service) {
  const duration = Number(service.duration);
  return Number.isFinite(duration) && duration > 0 ? `${service.name} (${duration} мин)` : service.name;
}

const WEEK_DAYS = [
  ["1", "Пон"],
  ["2", "Вто"],
  ["3", "Сря"],
  ["4", "Чет"],
  ["5", "Пет"],
  ["6", "Съб"],
  ["0", "Нед"],
];

function parseScheduleDays(days) {
  if (Array.isArray(days)) return days.map(Number);
  if (typeof days === "string" && days.trim()) {
    try {
      const parsed = JSON.parse(days);
      return Array.isArray(parsed) ? parsed.map(Number) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function formatScheduleDays(days) {
  const selected = parseScheduleDays(days);
  if (selected.length === 0) return "—";
  return WEEK_DAYS.filter(([value]) => selected.includes(Number(value))).map(([, label]) => label).join(", ");
}

export default function ClassesAdminPage() {
  const { getToken } = useOutletContext();
  const [classes, setClasses] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [studios, setStudios] = useState([]);
  const [services, setServices] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingScheduleId, setEditingScheduleId] = useState(null);
  const [form, setForm] = useState({
    startsLocal: "",
    price: "",
    capacity: "10",
    serviceId: "",
    studioId: "",
    instructorId: "",
    cancellationReason: "",
  });
  const [scheduleForm, setScheduleForm] = useState({
    classId: "",
    recurrenceRule: "weekly",
    startDate: "",
    endDate: "",
    daysOfWeek: ["1", "3", "5"],
    startTime: "09:00",
  });

  const loadRefs = () =>
    Promise.all([
      apiRequest(getToken, "/api/admin/studios"),
      apiRequest(getToken, "/api/admin/services"),
      apiRequest(getToken, "/api/admin/instructors"),
    ]).then(([st, se, ins]) => {
      setStudios(st.studios ?? []);
      setServices(se.services ?? []);
      setInstructors(ins.instructors ?? []);
    });

  const loadClasses = () =>
    apiRequest(getToken, "/api/admin/classes").then((j) => setClasses(j.classes ?? []));

  /** Schedules API exists only after server restart + migration; tolerate old servers (404). */
  const loadSchedules = () =>
    apiRequest(getToken, "/api/admin/schedules")
      .then((j) => setSchedules(j.schedules ?? []))
      .catch((e) => {
        if (e.status === 404) {
          setSchedules([]);
          return;
        }
        throw e;
      });

  useEffect(() => {
    setError("");
    Promise.all([loadRefs(), loadClasses(), loadSchedules()]).catch((e) => setError(e.message));
  }, [getToken]);

  const reset = () => {
    setEditingId(null);
    setForm({
      startsLocal: "",
      price: "",
      capacity: "10",
      serviceId: "",
      studioId: "",
      instructorId: "",
      cancellationReason: "",
    });
  };

  const save = (e) => {
    e.preventDefault();
    setError("");
    const startsAt = fromLocalInput(form.startsLocal);
    if (!startsAt) {
      setError("Невалидни дата и час за начало.");
      return;
    }
    const base = {
      name: null,
      description: null,
      startsAt,
      price: form.price === "" ? null : Number(form.price),
      capacity: Number(form.capacity),
      serviceId: Number(form.serviceId),
      studioId: Number(form.studioId),
      instructorId: Number(form.instructorId),
      cancellationReason: form.cancellationReason.trim() || null,
    };
    if (!Number.isInteger(base.capacity) || base.capacity < 1) {
      setError("Капацитетът трябва да е положително число.");
      return;
    }
    if (![base.serviceId, base.studioId, base.instructorId].every((n) => Number.isInteger(n) && n > 0)) {
      setError("Изберете услуга, студио и инструктор.");
      return;
    }
    if (base.price != null && Number.isNaN(base.price)) {
      setError("Невалидна цена.");
      return;
    }
    const body = JSON.stringify(base);
    const req =
      editingId == null
        ? apiRequest(getToken, "/api/admin/classes", { method: "POST", body })
        : apiRequest(getToken, `/api/admin/classes/${editingId}`, { method: "PATCH", body });
    req.then(() => {
      reset();
      return loadClasses();
    }).catch((err) => setError(err.message));
  };

  const edit = (c) => {
    setEditingId(c.id);
    setForm({
      startsLocal: toLocalInput(c.startsAt),
      price: c.price != null ? String(c.price) : "",
      capacity: String(c.capacity ?? 10),
      serviceId: String(c.serviceId ?? ""),
      studioId: String(c.studioId ?? ""),
      instructorId: String(c.instructorId ?? ""),
      cancellationReason: c.cancellationReason ?? "",
    });
  };

  const scheduleClass = (c) => {
    setEditingScheduleId(null);
    setScheduleForm((f) => ({
      ...f,
      classId: String(c.id),
      startDate: toDateInput(c.startsAt),
      startTime: toTimeInput(c.startsAt) || f.startTime,
    }));
  };

  const remove = (id) => {
    if (!window.confirm("Изтриване на клас? (Невъзможно при налични резервации.)")) return;
    setError("");
    apiRequest(getToken, `/api/admin/classes/${id}`, { method: "DELETE" })
      .then(() => loadClasses())
      .catch((e) => setError(e.message));
  };

  const resetSchedule = () => {
    setEditingScheduleId(null);
    setScheduleForm({
      classId: "",
      recurrenceRule: "weekly",
      startDate: "",
      endDate: "",
      daysOfWeek: ["1", "3", "5"],
      startTime: "09:00",
    });
  };

  const editSchedule = (schedule) => {
    setEditingScheduleId(schedule.id);
    setScheduleForm({
      classId: String(schedule.classId ?? ""),
      recurrenceRule: schedule.recurrenceRule ?? "weekly",
      startDate: String(schedule.startDate ?? "").slice(0, 10),
      endDate: schedule.endDate ? String(schedule.endDate).slice(0, 10) : "",
      daysOfWeek: parseScheduleDays(schedule.daysOfWeek).map(String),
      startTime: String(schedule.startTime ?? "09:00").slice(0, 5),
    });
  };

  const saveSchedule = (e) => {
    e.preventDefault();
    setError("");
    const body = JSON.stringify({
      classId: Number(scheduleForm.classId),
      recurrenceRule: scheduleForm.recurrenceRule,
      startDate: scheduleForm.startDate,
      endDate: scheduleForm.endDate || null,
      daysOfWeek: scheduleForm.daysOfWeek.map(Number),
      startTime: scheduleForm.startTime,
    });
    const request =
      editingScheduleId == null
        ? apiRequest(getToken, "/api/admin/schedules", { method: "POST", body })
        : apiRequest(getToken, `/api/admin/schedules/${editingScheduleId}`, { method: "PATCH", body });
    request
      .then(() => {
        resetSchedule();
        return Promise.all([loadSchedules(), loadClasses()]);
      })
      .catch((err) =>
        setError(
          err.status === 404
            ? "Няма API за график: рестартирайте сървъра (npm run dev) и пуснете миграцията (npm run db:migrate --prefix server)."
            : err.message
        )
      );
  };

  const generateSchedule = (id) => {
    setError("");
    apiRequest(getToken, `/api/admin/schedules/${id}/generate`, { method: "POST" })
      .then(() => loadClasses())
      .catch((err) =>
        setError(
          err.status === 404
            ? "Няма API за график: рестартирайте сървъра (npm run dev) и пуснете миграцията (npm run db:migrate --prefix server)."
            : err.message
        )
      );
  };

  const removeSchedule = (id) => {
    if (!window.confirm("Изтриване на график? Генерираните класове остават.")) return;
    setError("");
    apiRequest(getToken, `/api/admin/schedules/${id}`, { method: "DELETE" })
      .then(() => {
        if (editingScheduleId === id) resetSchedule();
        return loadSchedules();
      })
      .catch((err) =>
        setError(
          err.status === 404
            ? "Няма API за график: рестартирайте сървъра (npm run dev) и пуснете миграцията (npm run db:migrate --prefix server)."
            : err.message
        )
      );
  };

  return (
    <>
      <h3>Класове</h3>
      {error && <div className="error-banner">{error}</div>}
      <div className="panel">
        <form className="form-grid" onSubmit={save} style={{ maxWidth: "36rem" }}>
          <label>
            Начало *
            <input
              type="datetime-local"
              required
              value={form.startsLocal}
              onChange={(e) => setForm((f) => ({ ...f, startsLocal: e.target.value }))}
            />
          </label>
          <label>
            Цена
            <input type="number" step="0.01" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
          </label>
          <label>
            Капацитет *
            <input
              required
              type="number"
              min={1}
              value={form.capacity}
              onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
            />
          </label>
          <label>
            Услуга *
            <select
              required
              value={form.serviceId}
              onChange={(e) => setForm((f) => ({ ...f, serviceId: e.target.value }))}
            >
              <option value="">—</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {formatServiceOption(s)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Студио *
            <select
              required
              value={form.studioId}
              onChange={(e) => setForm((f) => ({ ...f, studioId: e.target.value }))}
            >
              <option value="">—</option>
              {studios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Инструктор *
            <select
              required
              value={form.instructorId}
              onChange={(e) => setForm((f) => ({ ...f, instructorId: e.target.value }))}
            >
              <option value="">—</option>
              {instructors.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.firstName} {i.lastName}
                </option>
              ))}
            </select>
          </label>
          <label>
            Причина за отмяна (скрива от публичния график)
            <input
              value={form.cancellationReason}
              onChange={(e) => setForm((f) => ({ ...f, cancellationReason: e.target.value }))}
            />
          </label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="submit" className="primary">
              {editingId == null ? "Създай" : "Запази"}
            </button>
            {editingId != null && (
              <button type="button" onClick={reset}>
                Отказ
              </button>
            )}
          </div>
        </form>
      </div>
      <div className="panel table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Кога</th>
              <th>Услуга / студио</th>
              <th>Продължителност</th>
              <th>Капацитет</th>
              <th>Отмяна</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {classes.map((c) => (
              <tr key={c.id}>
                <td>
                  {formatWhen(c.startsAt)} – {formatWhen(c.endsAt)}
                </td>
                <td>
                  {c.serviceName} / {c.studioName}
                </td>
                <td>{c.serviceDuration ? `${c.serviceDuration} мин` : "—"}</td>
                <td>{c.capacity}</td>
                <td>
                  {c.cancellationReason
                    ? c.cancellationReason.length > 36
                      ? `${c.cancellationReason.slice(0, 36)}…`
                      : c.cancellationReason
                    : "—"}
                </td>
                <td>
                  <button type="button" onClick={() => edit(c)}>
                    Редакция
                  </button>{" "}
                  <button type="button" onClick={() => scheduleClass(c)}>
                    График
                  </button>{" "}
                  <button type="button" className="danger" onClick={() => remove(c.id)}>
                    Изтрий
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3>Повтарящ се график</h3>
      <div className="panel">
        <form className="form-grid" onSubmit={saveSchedule} style={{ maxWidth: "36rem" }}>
          <label>
            Шаблонен клас *
            <select
              required
              value={scheduleForm.classId}
              onChange={(e) => setScheduleForm((f) => ({ ...f, classId: e.target.value }))}
            >
              <option value="">—</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.serviceName} / {formatWhen(c.startsAt)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Повторение *
            <select
              required
              value={scheduleForm.recurrenceRule}
              onChange={(e) => setScheduleForm((f) => ({ ...f, recurrenceRule: e.target.value }))}
            >
              <option value="daily">Всеки ден</option>
              <option value="weekly">Всяка седмица</option>
              <option value="monthly">Всеки месец</option>
              <option value="FREQ=WEEKLY;BYDAY=MO,WE,FR">iCal: Пон/Сря/Пет</option>
            </select>
          </label>
          <label>
            Начална дата *
            <input
              required
              type="date"
              value={scheduleForm.startDate}
              onChange={(e) => setScheduleForm((f) => ({ ...f, startDate: e.target.value }))}
            />
          </label>
          <label>
            Крайна дата
            <input
              type="date"
              value={scheduleForm.endDate}
              onChange={(e) => setScheduleForm((f) => ({ ...f, endDate: e.target.value }))}
            />
          </label>
          <label>
            Начален час *
            <input
              required
              type="time"
              value={scheduleForm.startTime}
              onChange={(e) => setScheduleForm((f) => ({ ...f, startTime: e.target.value }))}
            />
          </label>
          <fieldset>
            <legend>Дни от седмицата</legend>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
              {WEEK_DAYS.map(([value, label]) => (
                <label key={value} style={{ display: "inline-flex", gap: "0.25rem", alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={scheduleForm.daysOfWeek.includes(value)}
                    onChange={(e) =>
                      setScheduleForm((f) => ({
                        ...f,
                        daysOfWeek: e.target.checked
                          ? [...f.daysOfWeek, value]
                          : f.daysOfWeek.filter((day) => day !== value),
                      }))
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="submit" className="primary">
              {editingScheduleId == null ? "Създай график и генерирай класове" : "Запази график и генерирай"}
            </button>
            {editingScheduleId != null && (
              <button type="button" onClick={resetSchedule}>
                Отказ
              </button>
            )}
          </div>
        </form>
      </div>
      <div className="panel table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Шаблон</th>
              <th>Правило</th>
              <th>Дни</th>
              <th>Период</th>
              <th>Час</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {schedules.map((s) => (
              <tr key={s.id}>
                <td>{s.className || s.serviceId}</td>
                <td>{s.recurrenceRule}</td>
                <td>{formatScheduleDays(s.daysOfWeek)}</td>
                <td>
                  {String(s.startDate).slice(0, 10)} – {s.endDate ? String(s.endDate).slice(0, 10) : "без край"}
                </td>
                <td>{String(s.startTime).slice(0, 5)}</td>
                <td>
                  <button type="button" onClick={() => editSchedule(s)}>
                    Редакция
                  </button>{" "}
                  <button type="button" onClick={() => generateSchedule(s.id)}>
                    Генерирай
                  </button>{" "}
                  <button type="button" className="danger" onClick={() => removeSchedule(s.id)}>
                    Изтрий
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
