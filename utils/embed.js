"use client";

/**
 * Embed mode of the re-enrollment pages is part of the URL: /{school}/embed/re-enrollment (shown inside the Java dashboard's
 * iframe: no header, no footer) or /{school}/share/re-enrollment (normal page with header and footer).
 */

const PARENT_ORIGIN_KEY = "re-enrollment-parent-origin";

import { useSyncExternalStore } from "react";

/** True when this page is inside a frame (the dashboard). */
export function isFramed() {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

// Origin of the page that frames this one, used as the postMessage target so nothing is sent to a foreign page.
function parentOrigin() {
  try {
    const ancestors = window.location.ancestorOrigins;
    if (ancestors && ancestors.length) return ancestors[0];
  } catch {}
  try {
    const stored = window.sessionStorage.getItem(PARENT_ORIGIN_KEY);
    if (stored) return stored;
    if (document.referrer) {
      const origin = new URL(document.referrer).origin;
      if (origin !== window.location.origin) {
        window.sessionStorage.setItem(PARENT_ORIGIN_KEY, origin);
        return origin;
      }
    }
  } catch {}
  return "*";
}

/**
 * Full-page navigation that leaves the frame: the Java dashboard, the login page and the payment gateways must not load inside
 * the iframe (gateways refuse it). Inside the dashboard's iframe the dashboard does it (it listens for this message, see
 * renderReEnrollmentFrame in studentMigration.js): a cross-origin frame cannot reliably navigate its parent itself. Outside a
 * frame the page just navigates.
 */
export function navigateTop(url, { replace = true } = {}) {
  if (isFramed()) {
    window.parent.postMessage({ type: "re-enrollment:navigate", url, replace }, parentOrigin());
    // If the dashboard did not act on it (e.g. an older dashboard script without the listener), navigate the top window
    // ourselves; allowed from a click's activation, harmless when the dashboard already navigated.
    setTimeout(() => {
      try {
        window.open(url, "_top");
      } catch {}
    }, 800);
    return;
  }
  if (replace) window.location.replace(url);
  else window.location.assign(url);
}

/** isFramed() for rendering: false on the server and the first render, so markup does not differ between them. */
export function useFramed() {
  return useSyncExternalStore(
    () => () => {},
    isFramed,
    () => false
  );
}
