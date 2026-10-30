"use client";

// Records which backend call was in flight right before a render crash, so
// app/error.jsx (and global-error.jsx) can show it. Next.js redacts the real
// error message for anything thrown inside a "use server" action once it
// crosses back to the client in production — this sessionStorage breadcrumb
// is the only reliable way left to tell, from a screenshot, which endpoint a
// user was hitting when they landed on the error page.
const STORAGE_KEY = "lastApiAttempt";

export function recordApiAttempt(label, endpoint) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ label, endpoint, at: Date.now() }));
  } catch {
    // Private browsing / storage disabled — the error page just shows less detail.
  }
}

export function getLastApiAttempt() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
