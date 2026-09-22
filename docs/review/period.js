/** Payday periods. See CAPTURE_AND_SCREENS.md. */

export function clampDay(year, month, day) {
  const last = new Date(year, month, 0).getDate();
  return Math.min(day, last);
}

export function parseIso(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
}

export function toIso(y, m, d) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function addMonths(y, m, delta) {
  const date = new Date(y, m - 1 + delta, 1);
  return { y: date.getFullYear(), m: date.getMonth() + 1 };
}

export function dayBefore(iso) {
  const { y, m, d } = parseIso(iso);
  const date = new Date(y, m - 1, d - 1);
  return toIso(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

export function periodContaining(iso, paydayMode, paydayDay) {
  const { y, m, d } = parseIso(iso);
  if (paydayMode !== "day" || !paydayDay) {
    const start = toIso(y, m, 1);
    const next = addMonths(y, m, 1);
    const end = dayBefore(toIso(next.y, next.m, 1));
    return { start, end };
  }
  const clamped = clampDay(y, m, paydayDay);
  let startY = y;
  let startM = m;
  if (d < clamped) {
    const prev = addMonths(y, m, -1);
    startY = prev.y;
    startM = prev.m;
  }
  const startDay = clampDay(startY, startM, paydayDay);
  const start = toIso(startY, startM, startDay);
  const next = addMonths(startY, startM, 1);
  const nextStart = toIso(next.y, next.m, clampDay(next.y, next.m, paydayDay));
  return { start, end: dayBefore(nextStart) };
}

export function inPeriod(iso, period) {
  return iso >= period.start && iso <= period.end;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDay(iso) {
  const { y, m, d } = parseIso(iso);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function formatDayShort(iso) {
  const { m, d } = parseIso(iso);
  return `${d} ${MONTHS[m - 1]}`;
}

export function formatPeriod(period) {
  const a = parseIso(period.start);
  const b = parseIso(period.end);
  if (a.y === b.y) return `${a.d} ${MONTHS[a.m - 1]} – ${b.d} ${MONTHS[b.m - 1]}`;
  return `${formatDayShort(period.start)} ${a.y} – ${formatDayShort(period.end)} ${b.y}`;
}

export function todayIso() {
  const now = new Date();
  return toIso(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function addDays(iso, days) {
  const { y, m, d } = parseIso(iso);
  const date = new Date(y, m - 1, d + days);
  return toIso(date.getFullYear(), date.getMonth() + 1, date.getDate());
}
