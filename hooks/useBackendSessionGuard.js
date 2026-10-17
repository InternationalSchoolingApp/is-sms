"use client";

import { useEffect, useRef } from "react";
import { checkBackendSessionStatus } from "@/services/authApi";
import { expireSession } from "@/utils/logout";

// How often to ask the Java backend (is-rest-api) whether this user is still
// logged in there. Single-logout fix: a logout started on is-rest-api only
// invalidates ITS OWN HttpSession/USER_LOGIN_HASH — this app's next-auth
// session is a separate, independent cookie that otherwise never finds out.
// Polling is the only option without a shared session store or a
// backend-initiated webhook (neither exists today — see auth.js's header
// comment on the two parallel session systems).
const CHECK_INTERVAL_MS = 60_000;

/**
 * Mounted once by each wizard chrome (WizardChrome, AddEnrollmentChrome)
 * alongside their existing `status === "unauthenticated"` guard. Only polls
 * while this app believes the user IS authenticated — on a backend `false`,
 * it drops the local session the same way an expired next-auth session does
 * (expireSession -> signOut + redirect to the school's login page).
 */
export function useBackendSessionGuard(schoolUUID, session, status) {
  const uniqueId = session?.uniqueId;
  const loggingOutRef = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || !schoolUUID || !uniqueId) return;

    const checkOnce = async () => {
      if (loggingOutRef.current) return;
      const stillValid = await checkBackendSessionStatus(schoolUUID, uniqueId);
      if (!stillValid && !loggingOutRef.current) {
        loggingOutRef.current = true;
        expireSession(schoolUUID);
      }
    };

    const intervalId = setInterval(checkOnce, CHECK_INTERVAL_MS);
    // Also check right away when the tab regains focus — catches a logout
    // that happened on is-rest-api while this tab was in the background,
    // without waiting out the rest of the poll interval.
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") checkOnce();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [schoolUUID, uniqueId, status]);
}
