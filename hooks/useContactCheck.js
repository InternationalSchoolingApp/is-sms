"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import toast from "react-hot-toast";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useDummyStudent } from "@/hooks/useDummyStudent";
import { usePicoLive } from "@/components/k5/pico/picoEvents";
import { createContactCheckFlow } from "@/utils/contactCheckFlow";
import { isSessionExpired, markSessionExpired } from "@/utils/sessionState";
import { loadPendingContactChecks, sendContactCheckCode, skipContactCheck, stopContactCheckWhatsapp, verifyContactCheckCode } from "@/services/contactCheckApi";

/**
 * Contact check on the student dashboard home: binds the flow (utils/contactCheckFlow.js) to the server actions
 * (services/contactCheckApi.js) and to React.
 *
 * One flow per signed-in user for the whole page load (module scope), so "pending" is asked once - not again when
 * the home is opened a second time through the menu - and a popup that is over stays over until a real reload.
 *
 * The popup never blocks a live class and never opens over another popup (flow.setHold):
 *   live class   K-5 / Grade 6-8 home: what the planner already tells the buddy (picoEvents: `ready`, `name` of the
 *                class that is live now). Standard home: a live event drawn by the calendar (EventCard's
 *                "calendar-live-dashed"); the calendar keeps its events to itself, so that is the only signal there.
 *   other popup  anything marked data-blocking-popup (CalendarModal: onboarding video, graduation ceremony, event
 *                details; ChangePasswordModal; K5CompleteProfileModal), every shadcn dialog (the "LIVE NOW" alert,
 *                Get the App, My Look, session expired, ...) and every open native <dialog>.
 *
 * Returns { flow, state, finished }. `finished` is true once the contact check has had its turn or stands back
 * (state.yielded); the "Complete Your Profile" popup waits for it, so it comes second and never waits longer than
 * the "pending" timeout. Once shown it is itself a blocking popup, so the two are never on screen together.
 */

const OTHER_POPUPS = '[data-blocking-popup], [data-slot="dialog-content"], dialog[open]';
const LIVE_EVENT = ".calendar-live-dashed";

function readPage() {
  if (typeof document === "undefined") return { popup: false, liveEvent: false };
  const popup = Array.from(document.querySelectorAll(OTHER_POPUPS)).some((el) => !el.closest("[data-contact-check]"));
  return { popup, liveEvent: Boolean(document.querySelector(LIVE_EVENT)) };
}

const flows = new Map();
const IDLE = Object.freeze({ phase: "idle", items: [], index: 0, step: "", busy: false, alert: "", yielded: false });
const noSubscribe = () => () => {};
const idleState = () => IDLE;

function flowFor(userId) {
  const key = String(userId);
  if (!flows.has(key)) {
    let flow = null;
    // The server actions never throw; a signed-out answer opens the global dialog and the popup steps aside.
    const guard = (action) => async (request) => {
      if (isSessionExpired()) {
        flow.abandon();
        return { ok: false, refused: false, message: "Your session has been logged out" };
      }
      const result = await action(request);
      if (result?.sessionExpired) {
        markSessionExpired();
        flow.abandon();
      }
      return result;
    };
    flow = createContactCheckFlow({
      api: {
        pending: guard(loadPendingContactChecks),
        sendCode: guard(sendContactCheckCode),
        verify: guard(verifyContactCheckCode),
        noWhatsapp: guard(stopContactCheckWhatsapp),
        later: guard(skipContactCheck),
      },
    });
    flows.set(key, flow);
  }
  return flows.get(key);
}

const farewellShown = new WeakSet();

export function useContactCheck() {
  const { context } = useDashboardContext();
  const dummy = useDummyStudent();
  // A demo / dummy student has no real contacts to check.
  const known = Boolean(context?.userId) && dummy.settled;
  const wanted = known && !dummy.enabled;
  const flow = wanted ? flowFor(context.userId) : null;
  const state = useSyncExternalStore(flow ? flow.subscribe : noSubscribe, flow ? flow.getState : idleState, idleState);

  // Watched only while it matters: before the popup opens, and while it is open (a class may start).
  const { isK5 } = useDashboardContext();
  const picoLive = usePicoLive();
  const [page, setPage] = useState(readPage);
  const watching = Boolean(flow) && state.phase !== "finished";
  useEffect(() => {
    if (!watching) return undefined;
    const look = () => {
      const next = readPage();
      setPage((old) => (old.popup === next.popup && old.liveEvent === next.liveEvent ? old : next));
    };
    const timer = setInterval(look, 500);
    return () => clearInterval(timer);
  }, [watching]);
  // K-5: until the planner has loaded it is not known whether a class is live, so the popup waits.
  const live = isK5 ? !picoLive.ready || Boolean(picoLive.name) : page.liveEvent;

  useEffect(() => {
    if (!flow) return;
    const now = readPage();
    flow.setHold({ live: isK5 ? live : now.liveEvent, popup: now.popup });
    flow.load();
  }, [flow, isK5, live, page]);

  // A refusal met while leaving the last problem ("already answered", ...): said once, after the popup closed.
  useEffect(() => {
    if (!flow || state.phase !== "finished" || !state.farewell || farewellShown.has(flow)) return;
    farewellShown.add(flow);
    toast(state.farewell);
  }, [flow, state.phase, state.farewell]);

  return { flow, state, finished: known && (!wanted || state.yielded === true) };
}
