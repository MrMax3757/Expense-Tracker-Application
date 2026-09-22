/** Local calendar dates. Never shift a stored date through UTC. */

export function pad(n) {
  return String(n).padStart(2, "0");
}

export function toIso(y, m, d) {
  return `${y}-${pad(m)}-${pad(d)}`;
}

export function parseIso(iso) {
  const [y, m, d] = String(iso).split("-").map(Number);
  return { y, m, d };
}

export function todayIso(now = new Date()) {
  return toIso(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function fromParts(y, m, d) {
  const date = new Date(y, m - 1, d);
  return toIso(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

export function addDays(iso, days) {
  const { y, m, d } = parseIso(iso);
  return fromParts(y, m, d + days);
}

export function addMonths(iso, count) {
  const { y, m, d } = parseIso(iso);
  const first = new Date(y, m - 1 + count, 1);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  return toIso(first.getFullYear(), first.getMonth() + 1, Math.min(d, last));
}

export function lengthOfMonth(y, m) {
  return new Date(y, m, 0).getDate();
}

export function clampDay(y, m, day) {
  return Math.min(day, lengthOfMonth(y, m));
}

export function compareIso(a, b) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function inRange(iso, start, end) {
  return compareIso(iso, start) >= 0 && compareIso(iso, end) <= 0;
}

export function formatDisplay(iso) {
  const { y, m, d } = parseIso(iso);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d} ${months[m - 1]} ${y}`;
}

export function formatShort(iso, today = todayIso()) {
  if (iso === today) return "Today";
  if (iso === addDays(today, -1)) return "Yesterday";
  const { y, m, d } = parseIso(iso);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const year = y === parseIso(today).y ? "" : ` ${y}`;
  return `${d} ${months[m - 1]}${year}`;
}

export function monthRange(iso) {
  const { y, m } = parseIso(iso);
  const start = toIso(y, m, 1);
  const end = toIso(y, m, lengthOfMonth(y, m));
  return { start, end, label: formatMonth(iso) };
}

export function formatMonth(iso) {
  const { y, m } = parseIso(iso);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[m - 1]} ${y}`;
}

/**
 * Payday period containing `iso`. Day 31 clamps to the last day of a short month.
 * The period ends the day before the next payday.
 */
export function financialPeriod(iso, settings) {
  if (!settings || settings.paydayMode !== "day" || !settings.paydayDay) return monthRange(iso);
  const day = Number(settings.paydayDay);
  const { y, m, d } = parseIso(iso);
  const thisClamp = clampDay(y, m, day);
  let startY = y;
  let startM = m;
  if (d < thisClamp) {
    const prev = new Date(y, m - 2, 1);
    startY = prev.getFullYear();
    startM = prev.getMonth() + 1;
  }
  const start = toIso(startY, startM, clampDay(startY, startM, day));
  const next = new Date(startY, startM, 1);
  const end = addDays(toIso(next.getFullYear(), next.getMonth() + 1, clampDay(next.getFullYear(), next.getMonth() + 1, day)), -1);
  return { start, end, label: `${formatDisplay(start)} – ${formatDisplay(end)}` };
}

export function previousPeriod(range, settings) {
  const before = addDays(range.start, -1);
  return financialPeriod(before, settings);
}

export function weekRange(iso, weekStart = "monday") {
  const { y, m, d } = parseIso(iso);
  const date = new Date(y, m - 1, d);
  const wanted = weekStart === "sunday" ? 0 : 1;
  const delta = (date.getDay() - wanted + 7) % 7;
  const start = addDays(iso, -delta);
  return { start, end: addDays(start, 6), label: "This week" };
}

export function yearRange(iso) {
  const { y } = parseIso(iso);
  return { start: toIso(y, 1, 1), end: toIso(y, 12, 31), label: String(y) };
}

export function rangeFor(preset, today, settings) {
  if (preset === "today") return { start: today, end: today, label: "Today" };
  if (preset === "week") return weekRange(today, settings.weekStart);
  if (preset === "month") return { ...monthRange(today), label: "This month" };
  if (preset === "year") return { ...yearRange(today), label: "This year" };
  if (preset === "previous") {
    const current = financialPeriod(today, settings);
    const prev = previousPeriod(current, settings);
    return { ...prev, label: "Previous period" };
  }
  const period = financialPeriod(today, settings);
  return { ...period, label: settings.paydayMode === "day" ? period.label : "This period" };
}

export function eachDate(start, end) {
  const dates = [];
  let cursor = start;
  let guard = 0;
  while (compareIso(cursor, end) <= 0 && guard < 4000) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
    guard += 1;
  }
  return dates;
}

export function nextOccurrence(iso, frequency, interval = 1) {
  const step = Math.max(1, Number(interval) || 1);
  if (frequency === "daily") return addDays(iso, step);
  if (frequency === "weekly") return addDays(iso, 7 * step);
  if (frequency === "yearly") return addMonths(iso, 12 * step);
  if (frequency === "custom") return addDays(iso, step);
  return addMonths(iso, step);
}
