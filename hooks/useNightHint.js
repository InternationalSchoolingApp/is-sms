"use client";

import { useSyncExternalStore } from "react";
import { NIGHT_HINT_KEY } from "@/components/appearance/AppearanceProvider";

/**
 * Is the student's night mode on? For the screens that come BEFORE (or outside) the dashboard shell - the dashboard loading skeleton,
 * the payment hand-off and payment result pages - where the appearance (components/appearance/AppearanceProvider.jsx) is not mounted
 * yet. The provider writes this device-level hint whenever it knows the look ("dark" / "light", system mode included), like the hand
 * hint of the loading skeleton. The server render and the first paint are always light; the page turns dark when it is read.
 */
const subscribe = (callback) => {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
};

function readHint() {
  try {
    return window.localStorage.getItem(NIGHT_HINT_KEY) === "dark";
  } catch {
    return false;
  }
}

export function useNightHint() {
  return useSyncExternalStore(subscribe, readHint, () => false);
}
