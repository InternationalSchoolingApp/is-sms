"use client";

import { useState, useSyncExternalStore } from "react";
import { Eye, EyeOff, Lock, TimerReset } from "lucide-react";
import { useK5ThemeProps } from "@/components/k5/useK5ThemeProps";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { loginPageUrl, withLoginPayload } from "@/utils/backendOrigin";
import { expireSession } from "@/utils/logout";
import { SESSION_EXPIRED_MESSAGE, isSessionExpired, subscribeSessionExpired } from "@/utils/sessionState";

// The default card (every non-K–5 student, blue). Grade K–5 / 6–8 / 9–12 students get the dialog inside their own theme
// (K5Shell mounts it there): the card, field, button and icon use the K–5 tokens, so the student's colour, Day / Night, font
// and grade skin all apply, and nothing here has a colour of its own.
const LOOKS = {
  default: {
    form: "w-[700px] gap-5 rounded-xl bg-white px-6 pb-7 pt-5 text-black shadow-2xl",
    title: "-mt-3 text-2xl font-extrabold",
    field: "rounded-md border border-slate-300 bg-white focus-within:border-2 focus-within:border-blue-500",
    button: "rounded-full bg-[#0A7CFF] px-6 py-3 text-lg font-bold text-white",
    link: "text-[#0A8CFF]",
    icon: "",
  },
  elementary: {
    form: "w-[560px] gap-4 rounded-[32px] border-[4px] border-k5-line bg-k5-card px-6 pb-7 pt-6 font-k5-display text-k5-ink shadow-k5-chunky",
    title: "text-[28px] font-semibold leading-tight",
    field: "rounded-full border-[3px] border-k5-line bg-k5-soft focus-within:border-k5-ac",
    button: "rounded-full bg-k5-ac px-8 py-3 text-xl font-semibold text-white",
    link: "text-k5-acx",
    icon: "rounded-full bg-k5-act text-k5-acx",
  },
  middle: {
    form: "w-[600px] gap-4 rounded-3xl border-[3px] border-k5-line bg-k5-card px-7 pb-7 pt-6 font-k5-display text-k5-ink shadow-k5-chunky",
    title: "text-2xl font-bold",
    field: "rounded-xl border-2 border-k5-line bg-k5-soft focus-within:border-k5-ac",
    button: "rounded-xl bg-k5-ac px-7 py-3 text-base font-bold text-white",
    link: "text-k5-acx",
    icon: "rounded-2xl bg-k5-act text-k5-acx",
  },
  high: {
    form: "w-[520px] gap-4 rounded-xl border-2 border-k5-line bg-k5-card px-7 pb-7 pt-6 font-k5-display text-k5-ink shadow-k5-chunky",
    title: "text-xl font-semibold tracking-tight",
    field: "rounded-lg border-2 border-k5-line bg-k5-soft focus-within:border-k5-ac",
    button: "rounded-lg bg-k5-ac px-6 py-2.5 text-base font-semibold text-white",
    link: "text-k5-acx",
    icon: "rounded-xl bg-k5-act text-k5-acx",
  },
};

const BAND_COPY = {
  elementary: { title: "Oops! You were logged out", hint: "Type your password to come back in." },
  middle: { title: "Your session has been logged out", hint: "Enter your password to log in again and carry on." },
  high: { title: "Your session has been logged out", hint: "Enter your password to sign in again and continue where you left off." },
};

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
export function SessionExpiredDialog({ themed = false }) {
  const open = useSyncExternalStore(subscribeSessionExpired, isSessionExpired, () => false);
  const { session, context, isK5, isMiddle, isHigh } = useDashboardContext();
  const themeProps = useK5ThemeProps("fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm");
  // A K–5 student's dialog is the one inside their theme (themed); the one outside it stays closed for them.
  const band = !isK5 ? "default" : isHigh ? "high" : isMiddle ? "middle" : "elementary";
  const copy = BAND_COPY[band];
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const email = session?.email || "";
  const schoolUUID = context?.schoolUUID || session?.schoolUUID;

  if (!open || (isK5 && !themed)) return null;
  const look = LOOKS[band];

  function login(event) {
    event.preventDefault();
    if (busy || !password) return;
    setBusy(true);
    if (!email) {
      expireSession(schoolUUID);
      return;
    }
    // autologin=Y: the Java login page signs in with the password just typed instead of waiting for a click on Log in.
    window.location.assign(withLoginPayload(loginPageUrl(schoolUUID), email, password) + "&autologin=Y");
  }

  return (
    <div {...(themed ? themeProps : { className: "fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" })}>
      <form
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="session-expired-title"
        onSubmit={login}
        className={`flex max-h-full max-w-full flex-col items-center overflow-y-auto text-center max-[520px]:px-4 ${look.form}`}
      >
        {copy ? (
          <span aria-hidden="true" className={`flex h-20 w-20 items-center justify-center ${look.icon}`}>
            <TimerReset className="h-10 w-10" strokeWidth={2.4} />
          </span>
        ) : (
          <Hourglass />
        )}
        <h2 id="session-expired-title" className={`m-0 ${look.title}`}>{copy?.title ?? SESSION_EXPIRED_MESSAGE}</h2>
        {copy && <p className="m-0 text-base font-medium opacity-80">{copy.hint}</p>}
        <label className={`relative flex h-[54px] w-full items-center ${look.field}`}>
          <Lock className="ml-4 h-4 w-4 flex-none opacity-70" aria-hidden="true" />
          <input
            type={visible ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password *"
            aria-label="Password"
            autoComplete="current-password"
            autoFocus
            className="h-full min-w-0 flex-1 border-none bg-transparent px-3 text-base outline-none placeholder:opacity-60"
          />
          <button type="button" onClick={() => setVisible((v) => !v)} aria-label={visible ? "Hide password" : "Show password"} className="mr-3 flex-none cursor-pointer border-none bg-transparent p-1 text-inherit">
            {visible ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
          </button>
        </label>
        <button type="submit" disabled={busy || !password} className={`min-w-[110px] cursor-pointer disabled:cursor-default disabled:opacity-60 ${band === "elementary" ? "" : "border-none"} ${look.button}`}>
          {busy ? "Please wait…" : "Log in"}
        </button>
        <div className="text-base leading-snug">
          {email && <div>Logged in as {email}</div>}
          <div>
            Not You?{" "}
            <button type="button" onClick={() => expireSession(schoolUUID)} className={`cursor-pointer border-none bg-transparent p-0 text-base font-semibold hover:underline ${look.link}`}>
              Log in as a different user
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
