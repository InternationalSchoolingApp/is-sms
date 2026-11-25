"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePicoLive } from "@/components/k5/pico/picoEvents";

// Brain break (mockups: brkCfg / brkTick): after 1 hour of the dashboard being open and visible the student is asked to take a 10
// minute walk and drink a glass of water. "Remind me" asks again 5 minutes later. Times are in seconds.
export const BREAK_AFTER = 3600;
export const BREAK_SNOOZE = 300;
export const BREAK_WALK = 600;

// Something is already on top of the page: a real modal (same rule as PicoGuide's coveredByDialog: the non-modal cookie banner does
// not count), the opened side menu, or the buddy's own bubble (a tour / tip is being told: the break waits until it is closed).
const busy = () =>
  Boolean(document.querySelector('#k5-sidenav[data-open="true"]')) ||
  [...document.querySelectorAll('[role="alertdialog"],[role="dialog"]')].some(
    (d) =>
      !d.hasAttribute("data-brain-break") &&
      d.getBoundingClientRect().width > 0 &&
      (d.classList.contains("k5-bubble") || d.matches('[role="alertdialog"],[aria-modal="true"],[data-open],[data-state="open"]')),
  );

/**
 * The state machine behind the Break time dialog. `phase`: null (closed) | "ask" | "walk" | "done". The screen-time counter lives
 * in this browser tab only (a reload starts it again, like the mockup). It counts only while the tab is visible, and the dialog
 * only opens once the class popup has been answered and no other dialog is open (it waits, then opens as soon as they are gone).
 * onSay(kind) lets the caller have the buddy say the line for "ask" | "walk" | "done".
 */
export function useBrainBreak({ onSay } = {}) {
  const live = usePicoLive();
  const [phase, setPhase] = useState(null);
  const [walkLeft, setWalkLeft] = useState(BREAK_WALK);
  const [water, setWater] = useState(false);
  const phaseRef = useRef(null);
  const countRef = useRef(0);
  const walkEndRef = useRef(0);
  const pendingRef = useRef(false);
  const sayRef = useRef(onSay);
  useEffect(() => {
    sayRef.current = onSay;
  });
  useEffect(() => {
    pendingRef.current = live.pending;
  }, [live.pending]);

  const change = useCallback((next) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  useEffect(() => {
    const after = BREAK_AFTER;
    const id = setInterval(() => {
      if (phaseRef.current === "walk") {
        const left = Math.max(0, Math.ceil((walkEndRef.current - Date.now()) / 1000));
        setWalkLeft(left);
        if (left === 0) {
          change("done");
          sayRef.current?.("done");
        }
        return;
      }
      if (phaseRef.current) return;
      if (document.visibilityState === "hidden") return;
      countRef.current += 1;
      if (countRef.current >= after && !pendingRef.current && !busy()) {
        setWater(false);
        setWalkLeft(BREAK_WALK);
        change("ask");
        sayRef.current?.("ask");
      }
    }, 1000);
    return () => clearInterval(id);
  }, [change]);

  const startWalk = useCallback(() => {
    walkEndRef.current = Date.now() + BREAK_WALK * 1000;
    setWalkLeft(BREAK_WALK);
    change("walk");
    sayRef.current?.("walk");
  }, [change]);
  const drinkWater = useCallback(() => setWater(true), []);
  const snooze = useCallback(() => {
    countRef.current = BREAK_AFTER - BREAK_SNOOZE;
    change(null);
    sayRef.current?.("stop");
  }, [change]);
  const back = useCallback(() => {
    change("done");
    sayRef.current?.("done");
  }, [change]);
  const end = useCallback(() => {
    countRef.current = 0;
    change(null);
    sayRef.current?.("stop");
  }, [change]);

  return { phase, walkLeft, water, startWalk, drinkWater, snooze, back, end };
}
