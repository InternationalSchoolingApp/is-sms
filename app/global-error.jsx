"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import "./globals.css";

// Global error boundary for failures in the root layout itself. It replaces
// the root layout when active, so it must render its own <html>/<body>.
// Next.js 16 passes { error, retry }.
export default function GlobalError({ error, retry }) {
  useEffect(() => {
    console.error("Fatal application error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-[#eef4fb] font-sans antialiased">
        <main className="flex min-h-screen flex-col items-center justify-center p-6">
          <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-xl shadow-slate-900/5 ring-1 ring-slate-900/5 sm:p-10">
            <h1 className="text-xl font-bold text-slate-900">Something went wrong</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              A critical error occurred while loading the application. Please try again.
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
      </body>
    </html>
  );
}
