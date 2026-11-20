// TEMP DEBUG [api-log]: prints every server-side fetch (backend/SMS calls from server actions, route
// handlers, proxy token calls) to the terminal: method, url, status, duration and the response body.
// Remove this file once the post-payment login redirect is found.
const SECRET_KEY = /token|password|secret|authorization|cookie/i;
const MAX_BODY = 3000;

function redact(text) {
  try {
    return JSON.stringify(JSON.parse(text), (key, value) => (SECRET_KEY.test(key) ? "[redacted]" : value));
  } catch {
    return text;
  }
}

export function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || globalThis.__apiLogInstalled) return;
  globalThis.__apiLogInstalled = true;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async function loggedFetch(input, init) {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input?.url;
    const method = (init?.method || (typeof input === "object" && input?.method) || "GET").toUpperCase();
    const started = Date.now();
    try {
      const response = await originalFetch(input, init);
      let body = "";
      try {
        body = redact(await response.clone().text());
      } catch {
        body = "<unreadable>";
      }
      const shown = body.length > MAX_BODY ? `${body.slice(0, MAX_BODY)}…(${body.length} chars)` : body;
      console.log(`[api-log] ${method} ${url} -> ${response.status} (${Date.now() - started}ms)\n          ${shown}`);
      return response;
    } catch (err) {
      console.log(`[api-log] ${method} ${url} -> FAILED (${Date.now() - started}ms)`, err?.message);
      throw err;
    }
  };
}
