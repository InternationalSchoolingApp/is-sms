/**
 * Placeholder auth hash, matching the existing frontend's random-string
 * generator (Math.random().toString(36).substring(2)) — not a real security
 * token, confirmed at source.
 */
export function getHash() {
  return Math.random().toString(36).substring(2);
}

/**
 * Browser/runtime IANA timezone, e.g. "Asia/Kolkata".
 */
export function getSystemTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
