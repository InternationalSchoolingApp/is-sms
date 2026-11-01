"use client";

import { getSession } from "next-auth/react";
import { resolveBackendOrigin, hasBackendOrigin } from "@/utils/backendOrigin";
import { getLastApiAttempt } from "@/utils/lastApiAttempt";

// Fire-and-forget client → backend crash reporter. Hits the shared
// POST /api/v1/error-log/report endpoint that the sms-error-log module reads;
// anything error.jsx / global-error.jsx catches ends up in the Director's
// SMS Error Log view, so we don't rely on users sending screenshots.
//
// Deduped per-tab via sessionStorage: React dev strict-mode double-mounts
// error boundaries, and we don't want the same crash recorded twice.
const SENT_FLAG_PREFIX = "errReported:";

function makeErrorUuid() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function alreadySent(uuid) {
  try {
    const key = SENT_FLAG_PREFIX + uuid;
    if (sessionStorage.getItem(key)) return true;
    sessionStorage.setItem(key, "1");
    return false;
  } catch {
    return false;
  }
}

// Prefer sendBeacon so the report survives the user clicking "Go to homepage"
// (which immediately navigates away). Falls back to fetch(keepalive:true) and
// a plain fetch — any failure is swallowed since the backend endpoint itself
// is fire-and-forget.
function postPayload(url, payload) {
  const body = JSON.stringify(payload);
  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon(url, blob)) return;
    }
  } catch {
    // fall through
  }
  try {
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // give up silently — logging an error about failing to log an error is noise
  }
}

export async function reportErrorToBackend(error) {
  if (typeof window === "undefined") return;
  if (!hasBackendOrigin()) return;

  // digest is Next's stable id for the server error — use it as the dedupe key
  // when present so the same server crash isn't double-reported on remount.
  const errorUuid = error?.digest || makeErrorUuid();
  if (alreadySent(errorUuid)) return;

  const lastApiAttempt = getLastApiAttempt();

  // Session lookup is best-effort; a logged-out visitor or a broken session
  // still logs the error, just without userId/schoolId filled in.
  let session = null;
  try {
    session = await getSession();
  } catch {
    // ignore
  }

  const payload = {
    errorUuid,
    userId: session?.userId ?? null,
    schoolId: session?.schoolNumericId ?? null,
    userRole: session?.userRole ?? null,
    moduleId: null,
    pageNo: window.location.pathname,
    currentUrl: window.location.href,
    httpStatus: null,
    errorType: error?.name || "Error",
    errorMessage: error?.message || String(error) || "Unknown error",
    stackTrace: error?.stack ? String(error.stack).slice(0, 10000) : null,
    requestParams: lastApiAttempt ? JSON.stringify(lastApiAttempt) : null,
    userAgent: navigator.userAgent,
    source: "FRONTEND",
    appVersion: process.env.NEXT_PUBLIC_APP_VERSION || "is-sms",
  };

  const url = `${resolveBackendOrigin()}/api/v1/error-log/report`;
  postPayload(url, payload);
}
