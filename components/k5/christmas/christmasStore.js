"use client";

import { useSyncExternalStore } from "react";

/**
 * What the My Classes planner tells the Christmas theme (the mockups' xmasOn): the day the student is looking at is 25 December
 * (Day view of that date, or Month view with it selected), and the key of what is on screen (view + date), so "Turn off theme"
 * lasts only for that screen and comes back when the student moves to another day.
 */
const INITIAL = { onXmasDay: false, viewKey: "" };
let state = INITIAL;
const listeners = new Set();

export function setChristmasPlanner(patch) {
  const next = { ...state, ...patch };
  if (Object.keys(next).every((key) => next[key] === state[key])) return;
  state = next;
  listeners.forEach((listener) => listener());
}

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function useChristmasPlanner() {
  return useSyncExternalStore(subscribe, () => state, () => INITIAL);
}

/** "2026-12-25" and the like: any year's 25 December. */
export const isChristmasKey = (key) => /^\d{4}-12-25$/.test(String(key || ""));

/** Is it 25 December right now in `timeZone` (the student's own zone)? */
export function isChristmasNow(timeZone) {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone, month: "2-digit", day: "2-digit" }).format(new Date());
    return parts === "12-25";
  } catch {
    return false;
  }
}
