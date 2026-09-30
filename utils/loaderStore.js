import { useSyncExternalStore } from "react";

// Count of in-flight backend calls; <GlobalLoader /> shows loader-new.gif while it is above zero,
// like legacy's $.ajaxSetup loader. Background polls pass { silent: true } to stay out of it.
let pending = 0;
const listeners = new Set();

function emit() {
  listeners.forEach((listener) => listener());
}

export async function trackRequest(run, { silent = false } = {}) {
  if (silent) return run();
  pending += 1;
  emit();
  try {
    return await run();
  } finally {
    pending -= 1;
    emit();
  }
}

export function usePendingRequests() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => pending,
    () => 0
  );
}
