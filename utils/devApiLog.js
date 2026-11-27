// DEV ONLY: an in-memory list of the server's outgoing API calls (endpoint, status, time), filled by the fetch wrapper
// in instrumentation.js and streamed to the browser console by app/api/dev/api-log (DevApiConsoleLogger).
// Nothing here runs in production: the wrapper is only installed and the route only answers when
// NODE_ENV === "development". The list lives on globalThis so the instrumentation hook and the route share it.

const MAX_ENTRIES = 500;
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

function store() {
  if (!globalThis.__devApiLog) globalThis.__devApiLog = { entries: [], listeners: new Set(), seq: 0 };
  return globalThis.__devApiLog;
}

/** "/{uuid}/dashboard/parent/student-attendance-full": the path only (no query string, which can carry tokens). */
export function devApiEndpoint(url) {
  return url.pathname.replace(UUID, "{uuid}");
}

export function recordDevApiCall(entry) {
  const log = store();
  const saved = { id: ++log.seq, ...entry };
  log.entries.push(saved);
  if (log.entries.length > MAX_ENTRIES) log.entries.shift();
  for (const listener of log.listeners) {
    try {
      listener(saved);
    } catch {
      // a closed stream; its own abort handler unsubscribes it
    }
  }
}

/** Entries after the given id, or (with no id) those that started at or after `sinceMs`. */
export function devApiEntriesAfter({ afterId, sinceMs }) {
  const { entries } = store();
  if (afterId > 0) return entries.filter((entry) => entry.id > afterId);
  if (sinceMs > 0) return entries.filter((entry) => entry.at >= sinceMs);
  return [];
}

export function subscribeDevApiLog(listener) {
  const { listeners } = store();
  listeners.add(listener);
  return () => listeners.delete(listener);
}
