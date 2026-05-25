import { useMemo, useState } from "react";
import {
  buildWeekCalendarLayout,
  formatWeekRange,
  getWeekStart,
} from "../../utils/weekCalendarLayout.js";
import {
  classTitleFromRow,
  formatTimeRange,
  instructorNameFromRow,
} from "../../utils/scheduleDisplay.js";

const BGN_FORMATTER = new Intl.NumberFormat("bg-BG", {
  style: "currency",
  currency: "BGN",
  maximumFractionDigits: 2,
});
const HOUR_HEIGHT = 96;

function hasPrice(value) {
  return Number.isFinite(Number(value));
}

function formatPrice(value) {
  const price = Number(value);
  return Number.isFinite(price) ? BGN_FORMATTER.format(price) : "—";
}

function formatDuration(value) {
  const minutes = Number(value);
  return Number.isFinite(minutes) && minutes > 0 ? `${minutes} мин` : "—";
}

function classNamesForEvent(row) {
  const classes = ["week-cal-event"];
  const capacity = Number(row.capacity);
  const taken = takenFromRow(row);
  if (row.cancellationReason) classes.push("week-cal-event--cancelled");
  if (
    Number.isFinite(capacity) &&
    capacity > 0 &&
    Number.isFinite(taken) &&
    taken >= capacity
  ) {
    classes.push("week-cal-event--full");
  }
  return classes.join(" ");
}

function takenFromRow(row) {
  const taken = Number(row.taken);
  if (Number.isFinite(taken)) return taken;

  const capacity = Number(row.capacity);
  const spotsLeft = Number(row.spotsLeft);
  if (Number.isFinite(capacity) && Number.isFinite(spotsLeft)) {
    return Math.max(0, capacity - spotsLeft);
  }

  return Number.isFinite(capacity) && capacity > 0 ? 0 : NaN;
}

function studioFilterValue(row) {
  return String(row.studioId ?? row.studioName ?? "");
}

export default function WeeklyClassesCalendar({ classes, onClassClick }) {
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [selectedStudio, setSelectedStudio] = useState("all");
  const studioOptions = useMemo(() => {
    const options = new Map();
    for (const row of classes ?? []) {
      const value = studioFilterValue(row);
      if (!value) continue;
      options.set(value, String(row.studioName ?? "Студио").trim() || "Студио");
    }
    return Array.from(options, ([value, label]) => ({ value, label })).sort(
      (a, b) => a.label.localeCompare(b.label, "bg"),
    );
  }, [classes]);
  const filteredClasses = useMemo(() => {
    if (selectedStudio === "all") return classes ?? [];
    return (classes ?? []).filter(
      (row) => studioFilterValue(row) === selectedStudio,
    );
  }, [classes, selectedStudio]);
  const layout = useMemo(
    () => buildWeekCalendarLayout(filteredClasses, anchorDate),
    [filteredClasses, anchorDate],
  );

  const moveWeek = (offset) => {
    setAnchorDate((current) => {
      const next = new Date(current);
      next.setDate(next.getDate() + offset * 7);
      return next;
    });
  };

  const rowHeight = Math.max(1, layout.hourLabels.length - 1) * HOUR_HEIGHT;
  const hasEvents = layout.dayEvents.some((events) => events.length > 0);

  return (
    <section className="week-cal" aria-label="Седмичен календар на класове">
      <div className="week-cal-toolbar">
        <div>
          <h3>Календар</h3>
          <p className="muted">{formatWeekRange(layout.weekStart)}</p>
          <label className="week-cal-filter">
            <span>Студио</span>
            <select
              value={selectedStudio}
              onChange={(e) => setSelectedStudio(e.target.value)}
            >
              <option value="all">Всички студиа</option>
              {studioOptions.map((studio) => (
                <option key={studio.value} value={studio.value}>
                  {studio.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="week-cal-actions" aria-label="Навигация по седмици">
          <button type="button" onClick={() => moveWeek(-1)}>
            Предишна
          </button>
          <button
            type="button"
            onClick={() => setAnchorDate(getWeekStart(new Date()))}
          >
            Тази седмица
          </button>
          <button type="button" onClick={() => moveWeek(1)}>
            Следваща
          </button>
        </div>
      </div>

      {!hasEvents && <p className="muted">Няма класове в избраната седмица.</p>}

      <div className="week-cal-scroll">
        <div
          className="week-cal-grid"
          style={{
            "--week-cal-body-height": `${rowHeight}px`,
            "--week-cal-hour-height": `${HOUR_HEIGHT}px`,
            "--week-cal-hour-count": Math.max(1, layout.hourLabels.length - 1),
          }}
        >
          <div className="week-cal-corner" aria-hidden />
          {layout.days.map((day) => (
            <div key={day.label} className="week-cal-day-head">
              <span>{day.label}</span>
              <strong>{day.dateLabel}</strong>
            </div>
          ))}

          <div className="week-cal-time-col">
            {layout.hourLabels.map((hour, index) => (
              <div
                key={hour.minutes}
                className="week-cal-time-label"
                style={{ top: `${index * HOUR_HEIGHT}px` }}
              >
                {hour.label}
              </div>
            ))}
          </div>

          {layout.days.map((day, dayIndex) => (
            <div key={day.label} className="week-cal-day-col">
              <div className="week-cal-hour-lines" aria-hidden>
                {layout.hourLabels.slice(0, -1).map((hour) => (
                  <span key={hour.minutes} />
                ))}
              </div>
              {layout.dayEvents[dayIndex].map((event) => {
                const row = event.row;
                const capacity = Number(row.capacity);
                const taken = takenFromRow(row);
                const participants =
                  Number.isFinite(capacity) &&
                  capacity > 0 &&
                  Number.isFinite(taken)
                    ? `${taken}/${capacity}`
                    : "—";
                const instructor = instructorNameFromRow(row) || "—";
                const title = classTitleFromRow(row);
                const tooltip = [
                  `Студио: ${row.studioName ?? "—"}`,
                  `Услуга: ${row.serviceName ?? "—"}`,
                  `Продължителност: ${formatDuration(row.serviceDuration)}`,
                  row.cancellationReason
                    ? `Причина за отмяна: ${row.cancellationReason}`
                    : null,
                ]
                  .filter(Boolean)
                  .join("\n");

                return (
                  <article
                    key={row.id}
                    className="week-cal-event-wrap"
                    style={{
                      top: `${event.top}%`,
                      height: `${event.height}%`,
                      left: `${event.left}%`,
                      width: `${event.width}%`,
                    }}
                  >
                    <button
                      type="button"
                      className={classNamesForEvent(row)}
                      onClick={() => onClassClick?.(row)}
                    >
                      <div className="week-cal-event-title">{title}</div>
                      <div className="week-cal-event-meta week-cal-event-meta--secondary">
                        {instructor}
                      </div>
                      <div className="week-cal-event-meta">
                        {formatTimeRange(row)}
                      </div>
                      <div className="week-cal-event-footer">
                        <span className="week-cal-capacity">
                          {participants}
                        </span>
                        {hasPrice(row.price) && <span>{formatPrice(row.price)}</span>}
                      </div>
                      {row.cancellationReason && (
                        <span className="week-cal-badge">Отменен</span>
                      )}
                    </button>
                    <div className="week-cal-tooltip" role="tooltip">
                      <strong>{title}</strong>
                      <span>{tooltip}</span>
                    </div>
                  </article>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
