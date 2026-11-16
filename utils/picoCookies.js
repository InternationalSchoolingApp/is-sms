/*
 * Pico's "the welcome was delivered" mark: one cookie per user per browser, `pico_welcome_completed_{userId}`.
 *
 * A cookie (not localStorage / sessionStorage) on purpose: it lives with the browser profile, survives a restart, a
 * logout and the next login, is independent in Chrome / Firefox / Edge, and is separate for each user who shares a
 * browser. Logout (utils/logout.js -> /api/session/logout) only removes that user's sign-in cookies, so this one stays;
 * /api/cookie-flush (the "clear every cookie" support page) leaves it alone too.
 *
 * Each module's "Pico already explained this by itself" mark is its own cookie, `pico_module_{userId}_{module}` (same rules,
 * independent of the welcome and of each other): a module is explained automatically the first time that user opens it in
 * that browser, never again (a tap on Pico always explains, whatever the cookies say).
 *
 * They are read by the page's own JavaScript, so they cannot be HttpOnly. It holds no personal data: the value is "1" and the
 * name carries only the numeric user id. Path=/, SameSite=Lax, Secure on https.
 */

export const PICO_WELCOME_COOKIE_PREFIX = "pico_welcome_completed_";
export const PICO_MODULE_COOKIE_PREFIX = "pico_module_";

/** True for any cookie Pico owns: /api/cookie-flush and logout leave these alone. */
export const isPicoCookie = (name) => String(name).startsWith(PICO_WELCOME_COOKIE_PREFIX) || String(name).startsWith(PICO_MODULE_COOKIE_PREFIX);

// Browsers cap a cookie's life at about 400 days.
const MAX_AGE_SECONDS = 400 * 24 * 60 * 60;

const nameOf = (userId) => (/^[A-Za-z0-9_-]+$/.test(String(userId ?? "")) ? `${PICO_WELCOME_COOKIE_PREFIX}${userId}` : null);

/** True when this browser has already been welcomed by Pico for this user. Server / blocked cookies: false. */
export function hasPicoWelcomeCookie(userId) {
  const name = nameOf(userId);
  if (!name || typeof document === "undefined") return false;
  try {
    return document.cookie.split("; ").some((part) => part === `${name}=1`);
  } catch {
    return false;
  }
}

const SAFE = /^[A-Za-z0-9_-]+$/;
const moduleNameOf = (userId, moduleKey) =>
  SAFE.test(String(userId ?? "")) && SAFE.test(String(moduleKey ?? "")) ? `${PICO_MODULE_COOKIE_PREFIX}${userId}_${moduleKey}` : null;

function writeCookie(name) {
  if (!name || typeof document === "undefined") return;
  const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  try {
    document.cookie = `${name}=1; Max-Age=${MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`;
  } catch {
    // cookies blocked: it is tried again next visit
  }
}

/** True when Pico has already explained this module by itself for this user in this browser. */
export function hasPicoModuleCookie(userId, moduleKey) {
  const name = moduleNameOf(userId, moduleKey);
  if (!name || typeof document === "undefined") return false;
  try {
    return document.cookie.split("; ").some((part) => part === `${name}=1`);
  } catch {
    return false;
  }
}

/** Marks the module's automatic explanation as delivered for this user in this browser. */
export function setPicoModuleCookie(userId, moduleKey) {
  writeCookie(moduleNameOf(userId, moduleKey));
}

/** Marks the welcome as delivered for this user in this browser. */
export function setPicoWelcomeCookie(userId) {
  const name = nameOf(userId);
  if (!name || typeof document === "undefined") return;
  const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  try {
    document.cookie = `${name}=1; Max-Age=${MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`;
  } catch {
    // cookies blocked: the welcome is tried again next visit
  }
}
