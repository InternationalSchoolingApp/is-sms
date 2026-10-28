import { addMinutes, format, isValid, parse, startOfDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { FALLBACK_TIMEZONE } from "@/utils/calendarEvents";

const SLOT_FORMAT = "yyyy-MM-dd HH:mm:ss";

function parseSlot(value) {
  const date = parse(String(value || ""), SLOT_FORMAT, new Date());
  return isValid(date) ? date : null;
}

/**
 * Slot status for the weekly grid, mirroring legacy
 * studentBookClassContent.js weeklyBookClassTableBody: a slot is "closed"
 * when its day is already past (browser-local date, as legacy) or when it
 * starts within `showSlotAfter` hours of now in the student's timezone
 * (bookedStartDate is a wall-clock time in that zone).
 */
export function getSlotState(slot, day, { timeZoneName, showSlotAfter }) {
  const tz = timeZoneName || FALLBACK_TIMEZONE;
  const dayDate = new Date(day.displayStartDateWithoutDay);
  const pastDay = isValid(dayDate) && startOfDay(dayDate) < startOfDay(new Date());
  const start = parseSlot(slot.bookedStartDate);
  const nowInZone = toZonedTime(new Date(), tz);
  const cutoff = new Date(nowInZone.getTime() + (parseInt(showSlotAfter, 10) || 0) * 60 * 60 * 1000);
  const tooSoon = !start || start < cutoff;

  if (slot.status === "Booked") return pastDay || tooSoon ? "closed" : "booked";
  if (slot.status === "Available") return pastDay || tooSoon ? "closed" : "available";
  return "closed";
}

/** Booking window end, same arithmetic as legacy calculateEndDateTime. */
export function getSlotEnd(bookedStartDate, durationMinutes) {
  const start = parseSlot(bookedStartDate);
  if (!start) return null;
  const end = addMinutes(start, Number(durationMinutes) || 0);
  return { endDateTime: format(end, SLOT_FORMAT), endTime: format(end, "h:mm a") };
}

/** "Mon Oct 26, 2026" -> { dateText: "Oct 26", dayName: "MON" } (legacy table head). */
export function getDayHeading(day) {
  const raw = String(day.displayStartDate || day.displayStartDateWithoutDay || "");
  const parts = raw.split(",")[0].split(" ");
  if (parts.length >= 3) return { dateText: `${parts[1]} ${parts[2]}`, dayName: parts[0].toUpperCase() };
  return { dateText: raw, dayName: "" };
}

export const BOOKED_CLASS_STATUS_STYLES = {
  "Reschedule Session": { label: "Rescheduled", className: "bg-orange-500 text-white" },
  "Missed by Student": { label: "Missed by Student", className: "bg-black text-white" },
  "Missed by Teacher": { label: "Missed by Teacher", className: "bg-pink-600 text-white" },
  Completed: { label: "Completed", className: "bg-violet-600 text-white" },
  Cancelled: { label: "Cancelled", className: "bg-black text-white" },
};
