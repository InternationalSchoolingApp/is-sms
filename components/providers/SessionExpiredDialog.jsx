"use client";

import { useState, useSyncExternalStore } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { loginPageUrl, withLoginPayload } from "@/utils/backendOrigin";
import { expireSession } from "@/utils/logout";
import { SESSION_EXPIRED_MESSAGE, isSessionExpired, subscribeSessionExpired } from "@/utils/sessionState";

function Hourglass() {
  return (
    <svg width="170" height="120" viewBox="0 0 170 120" aria-hidden="true">
      <path d="M8 62h44a8 8 0 0 0 0-16H30a10 10 0 0 1 0-20h38" fill="none" stroke="#CFE6FB" strokeWidth="14" strokeLinecap="round" />
      <path d="M96 78h58a8 8 0 0 0 0-16h-14" fill="none" stroke="#CFE6FB" strokeWidth="14" strokeLinecap="round" />
      <ellipse cx="85" cy="112" rx="34" ry="4" fill="#9BD0F7" />
      <g transform="rotate(-14 85 60)">
        <rect x="52" y="12" width="66" height="9" rx="4.5" fill="#fff" stroke="#1E56A0" strokeWidth="3" />
        <rect x="52" y="98" width="66" height="9" rx="4.5" fill="#fff" stroke="#1E56A0" strokeWidth="3" />
        <path d="M58 21c0 22 14 24 14 39S58 77 58 98h54c0-21-14-23-14-38s14-17 14-39z" fill="#fff" stroke="#1E56A0" strokeWidth="3" strokeLinejoin="round" />
        <path d="M68 90c2-8 8-12 17-12s15 4 17 12z" fill="#FFE27A" stroke="#F0B429" strokeWidth="2" />
        <circle cx="79" cy="40" r="2.6" fill="#1E56A0" />
        <circle cx="92" cy="40" r="2.6" fill="#1E56A0" />
        <ellipse cx="85" cy="50" rx="4" ry="5.5" fill="#1E56A0" />
      </g>
      <circle cx="132" cy="28" r="2.4" fill="#E5243B" />
      <circle cx="148" cy="52" r="2.4" fill="none" stroke="#9BD0F7" strokeWidth="1.5" />
    </svg>
  );
}

/**
 * The one global "session expired" dialog (screenshot: centered card, dark blurred backdrop, hourglass, password,
 * Log in, "Logged in as ...", "Log in as a different user"). It opens when anything calls markSessionExpired()
 * (utils/sessionState.js) and cannot be dismissed - the session is gone. Sign-in reuses the existing
 * authentication: "Log in" goes through the Java login page with the saved e-mail + this password (the same hand-off
 * logoutEverywhere() uses), "Log in as a different user" is the existing expireSession() (sign out + login page).
 */
export function SessionExpiredDialog() {
  const open = useSyncExternalStore(subscribeSessionExpired, isSessionExpired, () => false);
  const { session, context } = useDashboardContext();
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const email = session?.email || "";
  const schoolUUID = context?.schoolUUID || session?.schoolUUID;

  if (!open) return null;

  function login(event) {
    event.preventDefault();
    if (busy || !password) return;
    setBusy(true);
    if (!email) {
      expireSession(schoolUUID);
      return;
    }
    window.location.assign(withLoginPayload(loginPageUrl(schoolUUID), email, password));
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <form
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="session-expired-title"
        onSubmit={login}
        className="flex max-h-full w-[700px] max-w-full flex-col items-center gap-5 overflow-y-auto rounded-xl bg-white px-6 pb-7 pt-5 text-center text-black shadow-2xl max-[520px]:px-4"
      >
        <Hourglass />
        <h2 id="session-expired-title" className="m-0 -mt-3 text-2xl font-extrabold">{SESSION_EXPIRED_MESSAGE}</h2>
        <label className="relative flex h-[54px] w-full items-center rounded-md border border-slate-300 bg-white focus-within:border-2 focus-within:border-blue-500">
          <Lock className="ml-4 h-4 w-4 flex-none text-slate-700" aria-hidden="true" />
          <input
            type={visible ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password *"
            aria-label="Password"
            autoComplete="current-password"
            autoFocus
            className="h-full min-w-0 flex-1 border-none bg-transparent px-3 text-base outline-none placeholder:text-slate-500"
          />
          <button type="button" onClick={() => setVisible((v) => !v)} aria-label={visible ? "Hide password" : "Show password"} className="mr-3 flex-none cursor-pointer border-none bg-transparent p-1 text-slate-800">
            {visible ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
          </button>
        </label>
        <button type="submit" disabled={busy || !password} className="min-w-[110px] cursor-pointer rounded-full border-none bg-[#0A7CFF] px-6 py-3 text-lg font-bold text-white disabled:cursor-default disabled:opacity-60">
          {busy ? "Please wait…" : "Log in"}
        </button>
        <div className="text-base leading-snug">
          {email && <div>Logged in as {email}</div>}
          <div>
            Not You?{" "}
            <button type="button" onClick={() => expireSession(schoolUUID)} className="cursor-pointer border-none bg-transparent p-0 text-base font-semibold text-[#0A8CFF] hover:underline">
              Log in as a different user
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
