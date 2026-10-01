"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";

// Root runtime error boundary. Next.js 16 passes { error, retry } (retry
// re-renders the segment). Catches uncaught render errors below the root
// layout and shows a recoverable fallback instead of a blank screen.
export default function Error({ error, retry }) {
  useEffect(() => {
    console.error("Unhandled application error:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#eef4fb] bg-gradient-to-b from-[#eaf2fc] via-[#eef5fc] to-[#e7f0fb] p-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-xl shadow-slate-900/5 ring-1 ring-slate-900/5 sm:p-10">
        <h1 className="text-xl font-bold text-slate-900">Something went wrong</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          We hit an unexpected error. Please try again — if the problem continues, reopen the link or contact support.
        </p>
        <button
          type="button"
          onClick={() => retry()}
          className="mt-6 inline-block rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
