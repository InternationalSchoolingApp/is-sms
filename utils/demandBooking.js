import { linkDemandBooking } from "@/services/bookClassApi";

let lastSession = null;

/** The demand pop-up the student last used; a booking made from "View all slots" is linked to it. */
export function rememberDemandSession(studentStandardId, sessionId) {
  lastSession = studentStandardId && sessionId ? { studentStandardId, sessionId } : null;
}

export function linkGridBooking(meetingStart) {
  if (!lastSession || !meetingStart) return;
  const { studentStandardId, sessionId } = lastSession;
  lastSession = null;
  linkDemandBooking({ studentStandardId, sessionId, meetingStart }).catch(() => {});
}

export function newDemandSessionId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

export function minutesOf(hhmm) {
  const [h, m] = String(hhmm).split(":").map(Number);
  return h * 60 + m;
}

export function hhmmOf(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export function labelOf(minutes) {
  const h = Math.floor(minutes / 60) % 24;
  return `${String(h % 12 || 12).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

/** Morning before 12:00, Afternoon 12:00–16:59, Evening from 17:00 — inside the picker range and step. */
export function timeGroups(from, to, step) {
  const groups = [["Morning", 0, 720], ["Afternoon", 720, 1020], ["Evening", 1020, 1441]];
  return groups
    .map(([label, lo, hi]) => {
      const times = [];
      for (let m = Math.max(minutesOf(from), lo); m <= minutesOf(to) && m < hi; m += step || 30) times.push(m);
      return { label, times };
    })
    .filter((g) => g.times.length);
}
