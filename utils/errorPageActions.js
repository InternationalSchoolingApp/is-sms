"use client";

// Primary action on the error/global-error/not-found pages. When the page knows its signed-in user it signs that
// one account out first (the same per-account logout as utils/logout.js: other users signed in to other tabs are
// not affected), since landing back on the same broken, still-signed-in page would just repeat the error. With no
// account (global-error.jsx has no session; an onClick handler is passed the click event) it only goes home.
export async function goHomeFromErrorPage(uniqueId) {
  if (typeof uniqueId === "string" && uniqueId) {
    try {
      await fetch("/api/session/logout", { method: "POST", headers: { "X-Account": uniqueId } });
    } catch {
      // Best-effort: still go home even if signing out failed.
    }
  }
  window.location.assign("/");
}
