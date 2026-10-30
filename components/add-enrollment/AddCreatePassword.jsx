"use client";

import { useState, useSyncExternalStore } from "react";
import { signOut } from "next-auth/react";
import { ArrowRight, Check, Eye, EyeOff, Lock, LockOpen, LoaderCircle, Phone, X } from "lucide-react";
import { createAddEnrollmentPassword } from "@/services/addEnrollmentPasswordApi";
import { loadCreatePasswordTarget } from "@/utils/addEnrollmentCreatePassword";
import { loginPageUrl, resolveBackendNavigationOrigin, withLoginPayload } from "@/utils/backendOrigin";
import { getPasswordStrength } from "@/utils/studentSignupValidation";

const RULES = [
  { key: "case", label: "1 UPPER and lower case letter (A-Z, a-z)" },
  { key: "digitAndSpecial", label: "1 number and 1 special character (! @ # $ % & *)" },
  { key: "length", label: "Minimum 8 to 20 characters" },
  { key: "noSequence", label: "No back-to-back patterns (12345, abcde, zyxwv)" },
];

const subscribeNone = () => () => {};

const initials = (name = "") =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("") || "S";

/**
 * Add-enrollment only "Unlock your Student Dashboard" page: the new student sets the SMS password (same
 * reset-password API as ChangePassword.jsx). Reads who it is for from the hand-off the thank-you button stored.
 */
export function AddCreatePassword({ schoolUUID }) {
  // sessionStorage is client-only: undefined on the server / first paint, null when the hand-off is missing.
  const target = useSyncExternalStore(subscribeNone, loadCreatePasswordTarget, () => undefined);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const strength = getPasswordStrength(password, confirm);
  const untouched = !password;

  // ChangePassword.jsp's logout(): clear client storage, then hit the Java logout endpoint (UNIQUEUUID "111" when
  // there is none), which ends the Java session and lands on the login page. Falls back to the login page itself.
  const goToLogin = async (credentials) => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      await signOut({ redirect: false });
    } catch {
      /* no Next.js session to drop */
    }
    const backend = resolveBackendNavigationOrigin();
    const url = backend ? `${backend}/${schoolUUID}/common/logout/111` : loginPageUrl(schoolUUID);
    window.location.assign(withLoginPayload(url, credentials?.email, credentials?.password));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (submitting || done) return;
    setError("");
    if (!password.trim() || !confirm.trim()) return setError("Fields are not valid");
    if (password.trim() !== confirm.trim()) return setError("Password does not match.");
    if (!strength.isValid) return setError("New password must match all requirements");
    setSubmitting(true);
    const res = await createAddEnrollmentPassword(schoolUUID, {
      userId: target.userId,
      password: password.trim(),
      confirmPassword: confirm.trim(),
    });
    setSubmitting(false);
    const status = String(res?.status ?? "");
    if (!res || ["0", "2", "3"].includes(status)) {
      if (status === "3") return goToLogin();
      return setError(res?.message || "Something went wrong. Please try again.");
    }
    try {
      const credentialsResponse = await fetch("/api/add-enrollment/login-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ school: schoolUUID, email: target.email, password: password.trim() }),
      });
      if (!credentialsResponse.ok) {
        return setError("Password was created, but automatic login fill could not be prepared. Please try again.");
      }
    } catch {
      return setError("Password was created, but automatic login fill could not be prepared. Please try again.");
    }
    setDone(true);
    setTimeout(() => goToLogin({ email: target.email, password: password.trim() }), 1500);
  };

  return (
    <main
      className="flex min-h-screen flex-col items-center bg-[#eef4fb] bg-cover bg-center bg-no-repeat px-4 py-8 sm:py-10"
      style={{ backgroundImage: "url('/images/signup-thankyou-bg.png')" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- static brand logo */}
      <img src="/images/IS_Final_Logo.webp" alt="International Schooling" className="mb-5 h-11 w-auto" />

      <div className="relative w-full max-w-[480px] rounded-3xl bg-white px-5 py-8 shadow-xl shadow-slate-900/5 ring-1 ring-slate-900/5 sm:px-8">
        <span className="absolute top-4 right-4 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-primary">
          Step 1 of 2
        </span>

        <div className="flex flex-col items-center text-center">
          <span className="mb-4 flex size-14 items-center justify-center rounded-full bg-blue-50 text-primary">
            <LockOpen className="size-6" aria-hidden="true" />
          </span>
          <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">Unlock your Student Dashboard</h1>
          <p className="mt-2 text-sm text-slate-600">
            Create your School Management System (SMS) password to access your classes, timetable, assignments and grades.
          </p>
        </div>

        {target === undefined ? null : target === null ? (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-center text-sm text-amber-900">
            This link is no longer valid. Please use the “Create password and unlock dashboard” button on your enrollment
            confirmation page, or sign in if you have already created your password.
            <a href={loginPageUrl(schoolUUID)} className="mt-3 block font-semibold text-primary hover:underline">
              Go to login
            </a>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 flex flex-col gap-4" autoComplete="off" noValidate>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                {initials(target.name)}
              </span>
              <div className="min-w-0 text-left">
                {target.name && <p className="truncate text-sm font-bold text-slate-900">{target.name}</p>}
                {target.email && <p className="text-xs break-all text-slate-600">Login Email: {target.email}</p>}
              </div>
            </div>

            <PasswordField
              id="password"
              value={password}
              onChange={setPassword}
              show={showPassword}
              onToggle={() => setShowPassword((v) => !v)}
              placeholder="Enter your password"
            />

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-left text-[13px] text-slate-600">
              <p className="mb-2 font-bold text-slate-900">Password must include at least:</p>
              <ul className="space-y-1.5">
                {RULES.map((rule) => (
                  <li key={rule.key} className="flex items-center gap-2">
                    {untouched ? (
                      <Check className="size-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                    ) : strength[rule.key] ? (
                      <Check className="size-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
                    ) : (
                      <X className="size-3.5 shrink-0 text-red-500" aria-hidden="true" />
                    )}
                    <span className={untouched ? "" : strength[rule.key] ? "text-emerald-800" : "text-red-600"}>
                      {rule.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <PasswordField
              id="confirmPassword"
              value={confirm}
              onChange={setConfirm}
              show={showConfirm}
              onToggle={() => setShowConfirm((v) => !v)}
              placeholder="Confirm your password"
            />

            {error && (
              <p role="alert" className="text-center text-sm font-semibold text-red-600">
                {error}
              </p>
            )}
            {done && (
              <p role="status" className="text-center text-sm font-semibold text-emerald-700">
                Password created. Redirecting you to login…
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || done}
              className="mx-auto inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-primary px-6 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 sm:w-auto"
            >
              {submitting ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
              Unlock my dashboard
              {!submitting && <ArrowRight className="size-4" aria-hidden="true" />}
            </button>
          </form>
        )}

        <hr className="my-5 border-slate-200" />
        
        <p className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-[13px] text-slate-600">
          Need help?
          <a
            href="https://wa.me/15854990662"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-bold text-primary hover:underline"
          >
            <span className="flex size-[18px] items-center justify-center rounded-full bg-[#25D366]" aria-hidden="true">
              <Phone className="size-2.5 fill-white text-white" />
            </span>
            Chat with us on WhatsApp: +1 (585) 499-0662
          </a>
        </p>
      </div>

      <footer className="py-5 text-center text-xs text-slate-500">
        Copyright © {new Date().getFullYear()} - International Schooling - All Rights Reserved.
      </footer>
    </main>
  );
}

function PasswordField({ id, value, onChange, show, onToggle, placeholder }) {
  return (
    <div className="relative">
      <Lock className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
      <input
        id={id}
        name={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={20}
        autoComplete="new-password"
        aria-label={placeholder}
        className="h-12 w-full rounded-xl border border-slate-200 bg-white pr-12 pl-11 text-sm text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
      {!value && (
        <span className="pointer-events-none absolute top-1/2 left-11 -translate-y-1/2 text-sm text-slate-400">
          {placeholder} <span className="text-red-500">*</span>
        </span>
      )}
      <button
        type="button"
        onClick={onToggle}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute top-1/2 right-2 flex size-9 -translate-y-1/2 items-center justify-center text-slate-500"
      >
        {show ? <Eye className="size-[18px]" aria-hidden="true" /> : <EyeOff className="size-[18px]" aria-hidden="true" />}
      </button>
    </div>
  );
}
