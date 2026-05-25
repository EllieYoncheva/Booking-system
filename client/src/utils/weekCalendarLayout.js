const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MINUTES = 60;
const DEFAULT_GRID_START = 7 * HOUR_MINUTES;
const DEFAULT_GRID_END = 21 * HOUR_MINUTES;

const DAY_LABELS = ["Пон", "Вто", "Сря", "Чет", "Пет", "Съб", "Нед"];

function isValidDate(date) {
  return date instanceof Date && !Number.isNaN(date.getTime());
}

function startOfLocalDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function minutesSinceLocalMidnight(date) {
  return date.getHours() * HOUR_MINUTES + date.getMinutes();
}

function addMinutes(date, minutes) {
  const next = new Date(date);
  next.setMinutes(next.getMinutes() + minutes);
  return next;
}

function formatDayDate(date) {
  return date.toLocaleDateString("bg-BG", {
    day: "2-digit",
    month: "2-digit",
  });
}

function formatHourLabel(minutes) {
  const hours = Math.floor(minutes / HOUR_MINUTES);
  return `${String(hours).padStart(2, "0")}:00`;
}

export function getWeekStart(date = new Date()) {
  const base = isValidDate(date) ? date : new Date();
  const start = startOfLocalDay(base);
  const day = start.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + mondayOffset);
  return start;
}

function classEndDate(row, start) {
  const explicitEnd = row.endsAt ? new Date(row.endsAt) : null;
  if (isValidDate(explicitEnd) && explicitEnd > start) return explicitEnd;

  const duration = Number(row.serviceDuration);
  if (Number.isFinite(duration) && duration > 0) {
    return addMinutes(start, duration);
  }

  return addMinutes(start, HOUR_MINUTES);
}

function classInWeek(row, weekStart, weekEnd) {
  const start = new Date(row.startsAt);
  return isValidDate(start) && start >= weekStart && start < weekEnd;
}

function assignClusterColumns(cluster) {
  const columns = [];
  const placed = cluster.map((event) => {
    let columnIndex = columns.findIndex((lastEnd) => lastEnd <= event.startMs);
    if (columnIndex === -1) {
      columnIndex = columns.length;
      columns.push(event.endMs);
    } else {
      columns[columnIndex] = event.endMs;
    }
    return { ...event, columnIndex };
  });

  const width = 100 / Math.max(columns.length, 1);
  return placed.map((event) => ({
    ...event,
    columns: columns.length,
    left: event.columnIndex * width,
    width,
  }));
}

function layoutDayEvents(events) {
  const sorted = [...events].sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);
  const laidOut = [];
  let cluster = [];
  let clusterEnd = -Infinity;

  for (const event of sorted) {
    if (cluster.length > 0 && event.startMs >= clusterEnd) {
      laidOut.push(...assignClusterColumns(cluster));
      cluster = [];
      clusterEnd = -Infinity;
    }

    cluster.push(event);
    clusterEnd = Math.max(clusterEnd, event.endMs);
  }

  if (cluster.length > 0) {
    laidOut.push(...assignClusterColumns(cluster));
  }

  return laidOut;
}

export function buildWeekCalendarLayout(rows, anchorDate = new Date()) {
  const weekStart = getWeekStart(anchorDate);
  const weekEnd = new Date(weekStart.getTime() + 7 * DAY_MS);
  const weekRows = rows.filter((row) => classInWeek(row, weekStart, weekEnd));

  const normalized = weekRows.map((row) => {
    const start = new Date(row.startsAt);
    const end = classEndDate(row, start);
    const dayIndex = Math.floor((startOfLocalDay(start).getTime() - weekStart.getTime()) / DAY_MS);
    return {
      row,
      start,
      end,
      startMs: start.getTime(),
      endMs: end.getTime(),
      dayIndex,
      startMinutes: minutesSinceLocalMidnight(start),
      endMinutes: minutesSinceLocalMidnight(end),
    };
  });

  const hasEvents = normalized.length > 0;
  const minStart = hasEvents ? Math.min(...normalized.map((event) => event.startMinutes)) : DEFAULT_GRID_START;
  const maxEnd = hasEvents
    ? Math.max(
        ...normalized.map((event) => {
          const sameDay = event.end.toDateString() === event.start.toDateString();
          return sameDay ? event.endMinutes : 24 * HOUR_MINUTES;
        }),
      )
    : DEFAULT_GRID_END;

  const gridStartMinutes = hasEvents
    ? Math.max(0, Math.floor(minStart / HOUR_MINUTES) * HOUR_MINUTES - HOUR_MINUTES)
    : DEFAULT_GRID_START;
  const gridEndMinutes = hasEvents
    ? Math.min(24 * HOUR_MINUTES, Math.ceil(maxEnd / HOUR_MINUTES) * HOUR_MINUTES + HOUR_MINUTES)
    : DEFAULT_GRID_END;
  const totalMinutes = Math.max(HOUR_MINUTES, gridEndMinutes - gridStartMinutes);

  const dayEvents = Array.from({ length: 7 }, () => []);
  for (const event of normalized) {
    if (event.dayIndex < 0 || event.dayIndex > 6) continue;
    const startOffset = event.startMinutes - gridStartMinutes;
    const duration = Math.max(20, (event.endMs - event.startMs) / 60000);
    dayEvents[event.dayIndex].push({
      ...event,
      top: Math.max(0, (startOffset / totalMinutes) * 100),
      height: Math.min(100, (duration / totalMinutes) * 100),
    });
  }

  const hourLabels = [];
  for (let minutes = gridStartMinutes; minutes <= gridEndMinutes; minutes += HOUR_MINUTES) {
    hourLabels.push({ minutes, label: formatHourLabel(minutes) });
  }

  const days = DAY_LABELS.map((label, index) => {
    const date = new Date(weekStart.getTime() + index * DAY_MS);
    return {
      label,
      date,
      dateLabel: formatDayDate(date),
    };
  });

  return {
    weekStart,
    weekEnd,
    days,
    hourLabels,
    dayEvents: dayEvents.map(layoutDayEvents),
    gridStartMinutes,
    gridEndMinutes,
    totalMinutes,
  };
}

export function formatWeekRange(weekStart) {
  const weekEnd = new Date(weekStart.getTime() + 6 * DAY_MS);
  return `${formatDayDate(weekStart)} - ${formatDayDate(weekEnd)}`;
}
