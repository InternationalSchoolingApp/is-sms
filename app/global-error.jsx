"use client"; // Error boundaries must be Client Components

import { useEffect, useState } from "react";
import "./globals.css";
import { getLastApiAttempt } from "@/utils/lastApiAttempt";
import { ErrorDetails, ErrorPageHeader, ErrorPageFooter } from "./error.jsx";

export default function GlobalError({ error, retry }) {
  const [lastApiAttempt, setLastApiAttempt] = useState(null);

  useEffect(() => {
    console.error("Fatal application error:", error);
    setLastApiAttempt(getLastApiAttempt());
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-[#eef4fb] font-sans antialiased">
        <main className="flex min-h-screen flex-col items-center p-6">
          <ErrorPageHeader />
          <div className="flex flex-1 flex-col items-center justify-center">
            <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-xl shadow-slate-900/5 ring-1 ring-slate-900/5 sm:p-10">
              <h1 className="text-xl font-bold text-black">Something went wrong</h1>
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
              <ErrorDetails error={error} lastApiAttempt={lastApiAttempt} />
            </div>
          </div>
          <ErrorPageFooter />
        </main>
      </body>
    </html>
  );
}
