import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { isValid, parseISO } from "date-fns";
import { getBrowserTimezone, resolveTimezone } from "@/utils/calendarEvents";

/**
 * The moment of a diary date - legacy parentSchoolDiaryFormatDate():
 *   convertDatetimeWithFormat(date, details.sourceTimezone, getSystemTimezone(), ...).
 * The server sends the date as a wall-clock string in `details.sourceTimezone` (no offset); it is read in that zone. A date
 * that carries an offset / Z is taken as it is. Timezone rule: a missing or invalid source zone is read as Asia/Singapore,
 * never as the browser's zone. null when the value is not a date.
 */
export function diaryInstant(value, sourceTimezone) {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const isoLike = raw.includes("T") ? raw : raw.replace(" ", "T");
  const hasOffset = /Z$/i.test(isoLike) || /[+-]\d\d:?\d\d$/.test(isoLike);
  const instant = hasOffset ? parseISO(isoLike) : fromZonedTime(isoLike, resolveTimezone(sourceTimezone));
  return isValid(instant) ? instant : null;
}

const viewerZone = (viewerTimezone) => resolveTimezone(viewerTimezone || getBrowserTimezone());

// formatInTimeZone options for an optional date-fns `locale` (month / day names in the dashboard language).
const withLocale = (locale) => (locale && typeof locale === "object" ? { locale } : undefined);

/** "ddd, DD MMM, YYYY hh:mm A" in the viewer's own zone (the browser's, like legacy). `locale`: optional date-fns locale. */
export function formatDiaryDate(value, sourceTimezone, viewerTimezone, { locale } = {}) {
  const instant = diaryInstant(value, sourceTimezone);
  return instant ? formatInTimeZone(instant, viewerZone(viewerTimezone), "EEE, dd MMM, yyyy hh:mm a", withLocale(locale)) : "";
}

/**
 * The chip above a day's notes (mockup diary): "Wednesday, October 21", with "Today · " in front for today. In the viewer's zone.
 * Optional `locale` (date-fns) and `t` = useTranslations("diary") give the dashboard language; without them it is English.
 */
export function diaryDayChipLabel(instant, viewerTimezone, now = new Date(), { locale, t } = {}) {
  const zone = viewerZone(viewerTimezone);
  const text = formatInTimeZone(instant, zone, "EEEE, MMMM d", withLocale(locale));
  if (formatInTimeZone(instant, zone, "yyyy-MM-dd") !== formatInTimeZone(now, zone, "yyyy-MM-dd")) return text;
  return t ? t("dates.todayChip", { date: text }) : `Today · ${text}`;
}

/** The day key (yyyy-MM-dd, viewer's zone) of a moment: notes with the same key sit under one chip. */
export function diaryDayKey(instant, viewerTimezone) {
  return formatInTimeZone(instant, viewerZone(viewerTimezone), "yyyy-MM-dd");
}

/**
 * Legacy formatDiaryDate() of the floating date: Today, Yesterday, the weekday inside a week, else "Mon, 02 Nov".
 * Optional `locale` (date-fns) and `t` = useTranslations("diary") give the dashboard language; without them it is English.
 */
export function diaryDayLabel(instant, viewerTimezone, now = new Date(), { locale, t } = {}) {
  const zone = viewerZone(viewerTimezone);
  const day = (date) => Date.parse(`${formatInTimeZone(date, zone, "yyyy-MM-dd")}T00:00:00Z`);
  const diff = Math.round((day(now) - day(instant)) / 86400000);
  if (diff === 0) return t ? t("dates.today") : "Today";
  if (diff === 1) return t ? t("dates.yesterday") : "Yesterday";
  if (diff < 7) return formatInTimeZone(instant, zone, "EEEE", withLocale(locale));
  return formatInTimeZone(instant, zone, "EEE, dd MMM", withLocale(locale));
}
