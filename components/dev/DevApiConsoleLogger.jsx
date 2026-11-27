"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * DEV ONLY: prints every API call the server makes for this page (server actions and route handlers; endpoint,
 * status, time) to the browser console, labelled with the dashboard module, e.g.
 *   [API] parent-attendance  POST /{uuid}/dashboard/parent/student-attendance-full → 200 · 412 ms
 * and, once the module's calls go quiet, a console.table of them with the count, total and slowest.
 *
 * The calls come from app/api/dev/api-log (fed by instrumentation.js). Renders nothing and opens no connection
 * outside `next dev`: the NODE_ENV check is replaced at build time, so production never runs it.
 * The module is the page open when the call finished. The log is the dev server's, so with several tabs or people
 * on one dev server their calls show up too.
 */
const QUIET_MS = 1500;

function moduleOf(pathname) {
  const parts = (pathname || "").split("/").filter(Boolean); // [school, role, ...module]
  if (parts.length < 2) return pathname || "/";
  const role = parts[1];
  return parts.length === 2 ? `${role} home` : parts.slice(2).join("/");
}

export function DevApiConsoleLogger() {
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return undefined;
    const since = Math.floor(performance.timeOrigin);
    const source = new EventSource(`/api/dev/api-log?since=${since}`);
    const batches = new Map(); // module name -> { rows, timer }

    const flush = (moduleName) => {
      const batch = batches.get(moduleName);
      batches.delete(moduleName);
      if (!batch?.rows.length) return;
      const total = batch.rows.reduce((sum, row) => sum + (Number(row.ms) || 0), 0);
      const slowest = batch.rows.reduce((max, row) => Math.max(max, Number(row.ms) || 0), 0);
      console.groupCollapsed(`[API] ${moduleName}: ${batch.rows.length} call(s), total ${total} ms, slowest ${slowest} ms`);
      console.table(batch.rows);
      console.groupEnd();
    };

    source.onmessage = (event) => {
      let entry;
      try {
        entry = JSON.parse(event.data);
      } catch {
        return;
      }
      const moduleName = moduleOf(pathRef.current);
      const slow = Number(entry.ms) >= 3000;
      const failed = entry.status === "FAILED" || Number(entry.status) >= 400;
      console.log(
        `%c[API] ${moduleName}%c ${entry.method} ${entry.endpoint} → ${entry.status} · ${entry.ms} ms`,
        "color:#2563eb;font-weight:600",
        failed ? "color:#dc2626" : slow ? "color:#d97706" : "color:inherit",
      );
      const batch = batches.get(moduleName) || { rows: [], timer: null };
      batch.rows.push({ endpoint: entry.endpoint, method: entry.method, status: entry.status, ms: entry.ms, host: entry.host, at: new Date(entry.at).toLocaleTimeString() });
      clearTimeout(batch.timer);
      batch.timer = setTimeout(() => flush(moduleName), QUIET_MS);
      batches.set(moduleName, batch);
    };

    return () => {
      source.close();
      for (const batch of batches.values()) clearTimeout(batch.timer);
    };
  }, []);

  return null;
}
