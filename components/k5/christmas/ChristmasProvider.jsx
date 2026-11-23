"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useAppearance } from "@/components/appearance/AppearanceProvider";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useStudentDashboardData } from "@/hooks/useStudentDashboardData";
import { resolveTimezone } from "@/utils/calendarEvents";
import { isChristmasNow, useChristmasPlanner } from "@/components/k5/christmas/christmasStore";
import { startChristmasMusic, stopChristmasMusic } from "@/components/k5/christmas/christmasMusic";
import { startChristmasSnow } from "@/components/k5/christmas/snowEngine";

/**
 * The Christmas (25 December) theme of the three dashboards (Playful / Middle / High mockups): a winter sky with falling snow that
 * piles on the cards, a banner with "Music on / off" and "Turn off theme", a Santa hat on Pico, a tree in place of the 25 in the
 * calendars. It is on when
 *   - it is 25 December today (in the student's own time zone, Asia/Singapore when none is set), on every page, or
 *   - the student is looking at 25 December in My Classes (that day's Day view, or Month view with it selected),
 * unless the student has turned it off: "Turn off theme" lasts for the screen they are on (moving to another day brings the theme
 * back for 25 December), the Look dialog's Christmas theme Off is for good (appearance.christmas). Music plays while the theme is
 * on, unless the student switched it off (remembered on this device).
 */
const ChristmasContext = createContext(null);
const MUSIC_KEY = "is-xmas-music-off";

const noop = () => {};
const DEFAULT = {
  festive: false,
  plannerXmas: false,
  realXmas: false,
  canTurnOn: false,
  musicOn: false,
  toggleMusic: noop,
  turnOff: noop,
  turnOn: noop,
  toastAt: 0,
};

export function useChristmas() {
  return useContext(ChristmasContext) ?? DEFAULT;
}

function readMusicOff() {
  try {
    return window.localStorage.getItem(MUSIC_KEY) === "1";
  } catch {
    return false;
  }
}

export function ChristmasProvider({ children }) {
  const { preferences } = useAppearance();
  const { context } = useDashboardContext();
  const pathname = usePathname();
  const planner = useChristmasPlanner();
  const dashboardData = useStudentDashboardData({ schoolUUID: context?.schoolUUID, userId: context?.userId });
  const timezone = resolveTimezone(dashboardData.userTimezone);

  // Is it 25 December right now where the student is? Checked again every minute (the page may stay open across midnight).
  const [realXmas, setRealXmas] = useState(false);
  useEffect(() => {
    const check = () => setRealXmas(isChristmasNow(timezone));
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, [timezone]);

  const prefOn = preferences.christmas !== "off";
  const screenKey = planner.viewKey || pathname || "page";
  const [off, setOff] = useState({ key: "", at: 0 });
  const offNow = off.key !== "" && off.key === screenKey;
  const active = prefOn && (planner.onXmasDay || realXmas);
  const festive = active && !offNow;
  const canTurnOn = active && offNow;

  // Remembered on this device; nothing renders from it before the theme is on, so the server and the browser never disagree.
  const [musicOff, setMusicOff] = useState(() => (typeof window === "undefined" ? false : readMusicOff()));
  const toggleMusic = useCallback(() => {
    setMusicOff((was) => {
      try {
        window.localStorage.setItem(MUSIC_KEY, was ? "0" : "1");
      } catch {
        // not remembered
      }
      return !was;
    });
  }, []);

  // The toast "Christmas theme is off..." shows for a few seconds after turning it off.
  const [toastAt, setToastAt] = useState(0);
  const toastTimer = useRef(0);
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);
  const turnOff = useCallback(() => {
    const at = Date.now();
    setOff({ key: screenKey, at });
    setToastAt(at);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastAt(0), 4500);
  }, [screenKey]);
  const turnOn = useCallback(() => {
    window.clearTimeout(toastTimer.current);
    setOff({ key: "", at: 0 });
    setToastAt(0);
  }, []);

  const musicOn = festive && !musicOff;
  useEffect(() => {
    if (musicOn) startChristmasMusic();
    else stopChristmasMusic();
    return () => stopChristmasMusic();
  }, [musicOn]);

  useEffect(() => {
    if (!festive) return undefined;
    return startChristmasSnow();
  }, [festive]);

  const value = useMemo(
    () => ({ festive, plannerXmas: planner.onXmasDay, realXmas, canTurnOn, musicOn, toggleMusic, turnOff, turnOn, toastAt }),
    [festive, planner.onXmasDay, realXmas, canTurnOn, musicOn, toggleMusic, turnOff, turnOn, toastAt],
  );
  return <ChristmasContext.Provider value={value}>{children}</ChristmasContext.Provider>;
}
