// Date / amount helpers for Buy Extra Classes + Cart — ports of dateUtil.js's
// getDateAfterNDays / getWeeksBetweenDates and buyExtraClass.js's week math.
// Dates are the browser's local calendar day in yyyy-MM-dd (DateUtil.STANDARD_DATE_FORMAT_1),
// exactly what the legacy page sends to add-to-cart.

const DAY_MS = 24 * 60 * 60 * 1000;

function toIsoDay(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function todayIso() {
  return toIsoDay(new Date());
}

export function isoAfterDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toIsoDay(date);
}

export function weeksBetween(startDate, endDate) {
  const diff = Math.abs(new Date(endDate) - new Date(startDate));
  return Math.floor(diff / (7 * DAY_MS));
}

// calculateNoOfWeeksFromEnrollmentEndDate(): whole weeks left before the course's enrollment ends.
export function weeksUntil(endDate) {
  if (!endDate) return 0;
  const days = Math.ceil((new Date(endDate) - new Date()) / DAY_MS);
  return Math.floor(days / 7);
}

// getTimeWhenEndDatePassed() < 0 -> "Inactive".
export function hasEnded(endDate) {
  return new Date(endDate) - new Date() < 0;
}

export function weeksLabel(weeks) {
  return `${weeks} ${weeks === 1 ? "week" : "weeks"}`;
}

export function formatAmount(symbol, amount) {
  return `${symbol || ""}${(parseFloat(amount) || 0).toFixed(2)}`;
}
