// DEV ONLY: times every server-side fetch (server actions, route handlers) and keeps endpoint, status and duration in
// utils/devApiLog.js, which the dashboard prints to the browser console per module (DevApiConsoleLogger). Never
// installed outside `next dev` (NODE_ENV "development"); no request or response bodies are kept.
async function installDevApiTiming() {
  if (process.env.NODE_ENV !== "development" || globalThis.__devApiTimingInstalled) return;
  globalThis.__devApiTimingInstalled = true;
  const { devApiEndpoint, recordDevApiCall } = await import("./utils/devApiLog.js");
  const innerFetch = globalThis.fetch;
  globalThis.fetch = async function timedFetch(input, init) {
    let url;
    try {
      url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input?.url);
    } catch {
      return innerFetch(input, init);
    }
    if (url.pathname.startsWith("/_next") || url.pathname.startsWith("/api/dev/")) return innerFetch(input, init);
    const method = (init?.method || (typeof input === "object" && input?.method) || "GET").toUpperCase();
    const at = Date.now();
    const started = performance.now();
    const record = (status) =>
      recordDevApiCall({ at, method, host: url.host, endpoint: devApiEndpoint(url), status, ms: Math.round(performance.now() - started) });
    try {
      const response = await innerFetch(input, init);
      record(response.status);
      return response;
    } catch (err) {
      record("FAILED");
      throw err;
    }
  };
}

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") await installDevApiTiming();
}
