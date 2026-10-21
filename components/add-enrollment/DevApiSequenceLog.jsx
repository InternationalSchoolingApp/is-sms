"use client";

import { useEffect } from "react";

/**
 * TEMPORARY debugging aid (dev only): prints every API call this page makes to the browser console, in the order
 * the calls START, as   [api-sequence] #3  getStudentReviewDetails (services/…js) — status 200, 142ms
 * Server Actions are matched to their function name through /api/dev/action-names; plain fetch() calls show their URL.
 * Remove the component (and app/api/dev/action-names) once the sequence has been checked.
 */
export function DevApiSequenceLog({ label = "api-sequence" }) {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return undefined;
    const originalFetch = window.fetch;
    let counter = 0;
    const startedAt = performance.now();
    let namesPromise = null;
    const loadNames = () => {
      if (!namesPromise) namesPromise = originalFetch("/api/dev/action-names").then((r) => r.json()).catch(() => ({}));
      return namesPromise;
    };

    window.fetch = async function patchedFetch(input, init) {
      const url = typeof input === "string" ? input : input?.url || String(input);
      if (url.includes("/api/dev/action-names") || url.includes("/_next/") || url.includes("/api/auth/")) {
        return originalFetch.call(this, input, init);
      }
      const headers = new Headers(init?.headers || (typeof input === "object" ? input.headers : undefined));
      const actionId = headers.get("next-action");
      const n = ++counter;
      const start = performance.now();
      try {
        const response = await originalFetch.call(this, input, init);
        const names = actionId ? await loadNames() : {};
        const name = actionId ? names[actionId] || `server action ${actionId.slice(0, 10)}…` : `${init?.method || "GET"} ${url}`;
        console.log(
          `[${label}] #${n}  ${name} — status ${response.status}, ${Math.round(performance.now() - start)}ms (started +${Math.round(start - startedAt)}ms)`
        );
        return response;
      } catch (err) {
        console.log(`[${label}] #${n}  ${actionId || url} — FAILED ${err?.message}`);
        throw err;
      }
    };
    console.log(`[${label}] logging started — calls are numbered in the order they start`);
    return () => {
      window.fetch = originalFetch;
    };
  }, [label]);
  return null;
}
