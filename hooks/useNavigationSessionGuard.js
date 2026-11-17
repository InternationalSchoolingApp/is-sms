"use client";

import { useEffect } from "react";
import { isSessionExpired, markSessionExpired } from "@/utils/sessionState";

// Does this browser still hold a login for the account? Errors answer true: a flaky request never signs anybody out.
async function stillSignedIn(account) {
  try {
    const response = await fetch("/api/session/alive", { headers: { "X-Account": account }, cache: "no-store" });
    if (!response.ok) return true;
    const body = await response.json();
    return body?.alive !== false;
  } catch {
    return true;
  }
}

const isPageRequest = (input, init) => {
  try {
    const headers = new Headers(init?.headers || (typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined));
    return headers.get("RSC") === "1";
  } catch {
    return false;
  }
};

/**
 * The same user logging out in another tab removes the browser's login cookies. This tab then shows the
 * "session logged out" dialog (markSessionExpired) instead of failing on the next click:
 *   - when the tab comes back into view it asks whether the login is still there, and
 *   - when a page request (the RSC fetch behind a menu click) fails because the login page redirect cannot be
 *     followed, it asks the same, opens the dialog and keeps that navigation waiting (so the browser is not sent to
 *     the login page behind the dialog).
 * Mounted once by the dashboard chrome.
 */
export function useNavigationSessionGuard(account) {
  useEffect(() => {
    if (!account) return undefined;
    let active = true;

    const check = async () => {
      if (isSessionExpired()) return;
      if (!(await stillSignedIn(account)) && active) markSessionExpired();
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", check);

    const original = window.fetch;
    const guarded = async function guardedFetch(input, init) {
      try {
        return await original.call(this, input, init);
      } catch (error) {
        if (error instanceof TypeError && isPageRequest(input, init) && !isSessionExpired() && !(await stillSignedIn(account))) {
          if (active) markSessionExpired();
          return new Promise(() => {});
        }
        throw error;
      }
    };
    window.fetch = guarded;

    return () => {
      active = false;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", check);
      if (window.fetch === guarded) window.fetch = original;
    };
  }, [account]);
}
