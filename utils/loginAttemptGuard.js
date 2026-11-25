import { getSettingValue } from "@/services/studentSignupApi";

/**
 * Wrong-password guard for /api/session/verify-password (server-only), the same rule SMS's own login uses
 * (is-rest-api CommonUtil#updateRequest / AuthService#authenticate): the limits come from the school's existing settings
 *   CONFIGURATION / LOGIN_LIMIT_COUNT             (default 5)  wrong passwords in a row before the address is blocked
 *   CONFIGURATION / LOGIN_LIMIT_INTERVAL_MINUTES  (default 5)  the window those attempts must fall in
 * and a blocked address gets SMS's E005 answer ("Maximum attempts reached...").
 *
 * Difference from SMS: SMS keeps the block in its IP_ADDRESS_STATUS table until an administrator (or a right password)
 * lifts it. This app has no table of its own, so the block lives in this server process's memory for
 * LOGIN_BLOCK_MINUTES (env, default 30) and every attempt from that address is refused meanwhile, right password too
 * (otherwise the block would still answer "right / wrong" to someone guessing). A right password before the block clears
 * the address's count.
 *
 * The address is the client's: x-real-ip, else the first x-forwarded-for entry (set by the hosting proxy).
 */

const DEFAULT_LIMIT = 5;
const DEFAULT_INTERVAL_MINUTES = 5;
const SETTINGS_TTL_MS = 5 * 60 * 1000;
const MAX_TRACKED = 10000;

const addresses = new Map(); // ip -> { wrong: number[] (timestamps), blockedUntil: number }
const settingsCache = new Map(); // schoolUUID -> { limit, intervalMs, until }

function blockMs() {
  const minutes = Number.parseInt(process.env.LOGIN_BLOCK_MINUTES || "", 10);
  return (Number.isFinite(minutes) && minutes > 0 ? minutes : 30) * 60 * 1000;
}

const positiveInt = (value, fallback) => {
  const n = Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

async function limitsFor(schoolUUID) {
  const hit = settingsCache.get(schoolUUID);
  if (hit && hit.until > Date.now()) return hit;
  let limit = DEFAULT_LIMIT;
  let minutes = DEFAULT_INTERVAL_MINUTES;
  try {
    const [count, interval] = await Promise.all([
      getSettingValue(schoolUUID, "CONFIGURATION", "LOGIN_LIMIT_COUNT"),
      getSettingValue(schoolUUID, "CONFIGURATION", "LOGIN_LIMIT_INTERVAL_MINUTES"),
    ]);
    limit = positiveInt(count, DEFAULT_LIMIT);
    minutes = positiveInt(interval, DEFAULT_INTERVAL_MINUTES);
  } catch {
    // SMS unreachable: SMS's own defaults.
  }
  const entry = { limit, intervalMs: minutes * 60 * 1000, until: Date.now() + SETTINGS_TTL_MS };
  settingsCache.set(schoolUUID, entry);
  return entry;
}

export function clientAddress(request) {
  const real = (request.headers.get("x-real-ip") || "").trim();
  if (real) return real;
  const forwarded = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim();
  return forwarded || "unknown";
}

function prune(now) {
  if (addresses.size < MAX_TRACKED) return;
  for (const [ip, state] of addresses) {
    if (state.blockedUntil <= now && state.wrong.every((t) => t <= now - 60 * 60 * 1000)) addresses.delete(ip);
  }
  if (addresses.size >= MAX_TRACKED) {
    for (const [ip, state] of addresses) if (state.blockedUntil <= now) addresses.delete(ip);
  }
}

/** Minutes left on this address's block (rounded up), or 0 when it is not blocked. */
export function blockedMinutesLeft(ip) {
  const state = addresses.get(ip);
  const left = state ? state.blockedUntil - Date.now() : 0;
  return left > 0 ? Math.ceil(left / 60000) : 0;
}

/**
 * One more wrong password from `ip`. Returns { blocked, minutesLeft, attemptsLeft }: blocked once `limit` wrong
 * passwords fall inside the school's interval.
 */
export async function recordWrongPassword(ip, schoolUUID) {
  const { limit, intervalMs } = await limitsFor(schoolUUID);
  const now = Date.now();
  prune(now);
  const state = addresses.get(ip) || { wrong: [], blockedUntil: 0 };
  state.wrong = state.wrong.filter((t) => t > now - intervalMs);
  state.wrong.push(now);
  if (state.wrong.length >= limit) {
    state.wrong = [];
    state.blockedUntil = now + blockMs();
    addresses.set(ip, state);
    return { blocked: true, minutesLeft: blockedMinutesLeft(ip), attemptsLeft: 0 };
  }
  addresses.set(ip, state);
  return { blocked: false, minutesLeft: 0, attemptsLeft: limit - state.wrong.length };
}

/** A right password: the address starts again from zero. */
export function recordRightPassword(ip) {
  const state = addresses.get(ip);
  if (state && state.blockedUntil <= Date.now()) addresses.delete(ip);
}
