"use client";

import { useEffect, useSyncExternalStore } from "react";

// Lets any K–5 page talk to the buddy (PicoGuide, mounted by K5Shell).

/**
 * Ask the buddy to say something and spotlight an element (`pin` = its data-pin). Call it from a
 * tap, so the buddy may talk. Options: `intro` — the message takes the place of the tour's first
 * tip (counter 1 / 8, Next continues with tip 2); `skipLive` — the tour then skips the "class is
 * live" tip (the student has just joined it).
 */
export const PICO_SAY_EVENT = "k5-pico-say";

export function picoSay(text, pin = null, options = {}) {
  window.dispatchEvent(new CustomEvent(PICO_SAY_EVENT, { detail: { text, pin, ...options } }));
}

/**
 * What the home page tells the buddy about the live class: `ready` — the plan has loaded (so the
 * tour knows whether a live class exists), `pending` — the "LIVE NOW" popup is waiting for an answer
 * (the buddy stays quiet until then), `name` — the title of the class that is live right now.
 * `menuReady` / `contentReady`: the left menu has its items and the page has finished loading — the
 * buddy's page tips (and their spotlight) wait for both, so nothing opens over an empty page.
 */
const INITIAL_LIVE = { ready: false, pending: false, name: "", menuReady: false, contentReady: false };
let live = INITIAL_LIVE;
const listeners = new Set();

export function setPicoLive(patch) {
  const next = { ...live, ...patch };
  if (Object.keys(next).every((key) => next[key] === live[key])) return;
  live = next;
  listeners.forEach((listener) => listener());
}

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function usePicoLive() {
  return useSyncExternalStore(subscribe, () => live, () => INITIAL_LIVE);
}

/**
 * A page calls this once its real content is on screen (`ready`), and the buddy may then open its tip for
 * the page. Leaving the page (or going back to loading) closes the gate again.
 */
export function usePicoContentReady(ready = true) {
  useEffect(() => {
    setPicoLive({ contentReady: Boolean(ready) });
    return () => setPicoLive({ contentReady: false });
  }, [ready]);
}
