"use client"; // Error boundaries must be Client Components

import { useEffect, useState } from "react";
import { getLastApiAttempt } from "@/utils/lastApiAttempt";
import { SchoolLogo } from "@/components/student-enroll/SchoolLogo";
import { goHomeFromErrorPage } from "@/utils/errorPageActions";
import { reportErrorToBackend } from "@/utils/reportErrorToBackend";

export default function Error({ error }) {
  const [lastApiAttempt, setLastApiAttempt] = useState(null);

  useEffect(() => {
    console.error("Unhandled application error:", error);
    setLastApiAttempt(getLastApiAttempt());
    reportErrorToBackend(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center bg-[#eef4fb] bg-gradient-to-b from-[#eaf2fc] via-[#eef5fc] to-[#e7f0fb] p-6">
      <ErrorPageHeader />
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-xl shadow-slate-900/5 ring-1 ring-slate-900/5 sm:p-10">
          <h1 className="text-xl font-bold text-black">Something went wrong</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            We hit an unexpected error. If this keeps happening, go back to the homepage and start again.
          </p>
          <button
            type="button"
            onClick={goHomeFromErrorPage}
            className="mt-6 inline-block rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
          >
            Go to homepage
          </button>
          <ErrorDetails error={error} lastApiAttempt={lastApiAttempt} />
        </div>
      </div>
      <ErrorPageFooter />
    </main>
  );
}

// No school context is available at this boundary (it sits above any
// [school]-scoped route data), so these always show the generic
// International Schooling brand/copyright rather than a specific school's.
export function ErrorPageHeader() {
  return (
    <div className="w-full py-2">
      <SchoolLogo width={160} />
    </div>
  );
}

export function ErrorPageFooter() {
  return (
    <p className="py-4 text-center text-xs text-slate-500">
      Copyright © {new Date().getFullYear()} - International Schooling - All Rights Reserved.
    </p>
  );
}

export function ErrorDetails({ error, lastApiAttempt }) {
  return (
    <details open className="mt-6 rounded-xl bg-slate-50 p-3 text-left text-xs text-slate-500">
      <summary className="cursor-pointer select-none font-semibold text-slate-600">Technical details</summary>
      <dl className="mt-2 space-y-1 break-words">
        <div>
          <dt className="inline font-semibold">Page: </dt>
          <dd className="inline">{typeof window !== "undefined" ? window.location.pathname : "—"}</dd>
        </div>
        {lastApiAttempt && (
          <div>
            <dt className="inline font-semibold">Last API call: </dt>
            <dd className="inline">
              {lastApiAttempt.label} ({new Date(lastApiAttempt.at).toLocaleTimeString()})
            </dd>
          </div>
        )}
        {lastApiAttempt?.endpoint && (
          <div>
            <dt className="inline font-semibold">Endpoint: </dt>
            <dd className="inline">{lastApiAttempt.endpoint}</dd>
          </div>
        )}
        <div>
          <dt className="inline font-semibold">Message: </dt>
          <dd className="inline">{error?.message || "—"}</dd>
        </div>
        {error?.digest && (
          <div>
            <dt className="inline font-semibold">Digest: </dt>
            <dd className="inline">{error.digest}</dd>
          </div>
        )}
      </dl>
    </details>
  );
}
