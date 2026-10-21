/**
 * Service-key utilities — kept separate from session.js so that client
 * components can import withServiceKey without pulling in next/headers.
 */

export function serviceKeyHeaders() {
  const key = (process.env.SMS_SERVICE_KEY || "").trim();
  return key ? { "X-Service-Key": key } : {};
}

export function withServiceKey(init = {}) {
  return { ...init, headers: { ...serviceKeyHeaders(), ...(init.headers || {}) } };
}
