"use client";

import { useState } from "react";
import { useMarketingConsent, writeConsent } from "@/utils/marketingConsent";

const PRIVACY_POLICY_URL = "https://internationalschooling.org/privacy-policy";

// Opt-in card for Meta (Facebook) marketing cookies, the same card as on the website. Two views: a short summary
// (Manage cookies / Accept all) and a "Manage cookies" view with one switch per category (Reject all / Save my
// choices). Shown until the visitor chooses; the choice is stored in the is_marketing_consent cookie, shared with the
// website, and travels with the lead.
//
// Layout: a floating card at the bottom centre. On wide screens it is narrowed so it never reaches the chat widget
// (bottom-right, loaded in production); on smaller screens it sits above it.
function Switch({ checked, onChange, label, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${
        checked ? "bg-blue-700" : "bg-gray-300"
      } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : ""
        }`}
      />
    </button>
  );
}

export default function ConsentBanner() {
  const consent = useMarketingConsent();
  const [dismissed, setDismissed] = useState(false);
  const [view, setView] = useState("summary"); // "summary" | "manage"
  const [marketing, setMarketing] = useState(false);

  if (consent !== null || dismissed) return null;

  const choose = (value) => {
    writeConsent(value);
    setDismissed(true);
  };

  const primary =
    "flex-1 cursor-pointer whitespace-nowrap rounded-full bg-linear-to-r from-blue-600 to-blue-800 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:shadow-lg hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2";
  const outline =
    "flex-1 cursor-pointer whitespace-nowrap rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2";

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[10000] flex justify-center px-3 xl:bottom-4">
      <div
        role="dialog"
        aria-labelledby="consent-title"
        className="consent-card pointer-events-auto w-full max-w-3xl rounded-2xl border border-blue-100 bg-white/95 p-4 text-gray-800 shadow-2xl ring-1 ring-black/5 backdrop-blur-md sm:p-5 xl:w-[min(48rem,calc(100vw_-_46rem))]"
      >
        {view === "summary" ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
            <div
              aria-hidden="true"
              className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700 sm:flex"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6l7-3z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <h2 id="consent-title" className="text-base font-bold text-gray-900">
                Your privacy matters
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-gray-600">
                We use cookies and similar technologies, including Meta (Facebook) tools, to measure our ads and
                improve your experience. Accept to allow them, or manage your choices.{" "}
                <a
                  href={PRIVACY_POLICY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-blue-700 underline underline-offset-2 hover:text-blue-800"
                >
                  Privacy Policy
                </a>
              </p>
            </div>
            <div className="flex shrink-0 gap-2 sm:w-40 sm:flex-col">
              <button type="button" onClick={() => setView("manage")} className={outline}>
                Manage cookies
              </button>
              <button type="button" onClick={() => choose("granted")} className={primary}>
                Accept all
              </button>
            </div>
          </div>
        ) : (
          <div>
            <h2 id="consent-title" className="text-base font-bold text-gray-900">
              Manage cookies
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-gray-600">
              Choose which cookies we may use. You can change your choice at any time from the website footer.
            </p>

            <ul className="mt-3 divide-y divide-gray-100 rounded-xl border border-gray-100">
              <li className="flex items-center justify-between gap-4 p-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">Strictly necessary</p>
                  <p className="text-xs leading-relaxed text-gray-600">
                    Needed for the site to work, such as sign-in, security and your preferences. Always on.
                  </p>
                </div>
                <Switch checked disabled label="Strictly necessary" />
              </li>
              <li className="flex items-center justify-between gap-4 p-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">Marketing (Meta / Facebook)</p>
                  <p className="text-xs leading-relaxed text-gray-600">
                    Lets us measure our ads and connect an enquiry to the ad that led to it. Off unless you allow it.
                  </p>
                </div>
                <Switch checked={marketing} onChange={setMarketing} label="Marketing (Meta / Facebook)" />
              </li>
            </ul>

            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setView("summary")}
                className="cursor-pointer self-start text-sm font-medium text-gray-600 underline underline-offset-2 hover:text-gray-900"
              >
                Back
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={() => choose("denied")} className={outline}>
                  Reject all
                </button>
                <button type="button" onClick={() => choose(marketing ? "granted" : "denied")} className={primary}>
                  Save my choices
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
