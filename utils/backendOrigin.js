/**
 * UAT-only "pick a backend" override — lets testers point this same
 * deployment at any of several UAT Spring Boot instances (different
 * IP:port combos) without a separate build/deploy per backend. Gated by
 * NEXT_PUBLIC_DEPLOYMENT_MODE being DEV or UAT — never deployed as PROD, so
 * it's dead code (and inert even if a stray cookie exists) on production.
 * See components/common/BackendSwitcher.jsx for the picker UI.
 *
 * Stored as a plain (non-httpOnly) cookie, not localStorage: the server-side
 * calls (Server Actions, /api/sso, the proxy) must hit the SAME backend the
 * browser chose, so the choice has to travel to the server. A cookie read via
 * next/headers does that; localStorage never leaves the browser. This cookie is
 * only ever read by OUR Next.js server to pick which origin string to call — it
 * is never forwarded to the backend itself.
 */
const BACKEND_OVERRIDE_COOKIE = "uat_backend_override";

export function isBackendOverrideAllowed() {
  const mode = String(process.env.NEXT_PUBLIC_DEPLOYMENT_MODE || "").trim().toUpperCase();
  return mode === "DEV" || mode === "UAT";
}

export function getBackendOverrideCookieName() {
  return BACKEND_OVERRIDE_COOKIE;
}

/**
 * Validates/normalizes a candidate backend origin string (the `backend` query param the Java
 * app now appends on its redirects into this app — see getFinalEnrollmentUrl and
 * ClientSignupStudentController#commonSignupContent). Returns the origin (no path/query/
 * trailing slash) or "" when missing/not an http(s) URL.
 */
export function parseBackendOrigin(value) {
  if (!value || typeof value !== "string") return "";
  try {
    const url = new URL(value);
    return /^https?:$/.test(url.protocol) ? url.origin : "";
  } catch {
    return "";
  }
}

/**
 * UAT only: which backend instance actually sent this browser here. There is no picker
 * involved when a student lands directly on one of several UAT backends' own pages (see
 * constant/UatBackendUrls.js) and that backend then redirects the browser into this app on
 * its own (Login.jsp's SSO handoff, or ClientSignupStudentController#commonSignupContent's
 * brand-new-signup redirect to /{school}/enrollment/{program}) — the redirect URL itself
 * carried no indication of which instance built it, since every instance points at the same
 * single Next.js deployment. Both of those now append an explicit `backend` query param
 * (read with parseBackendOrigin), which both callers below prefer; this Referer fallback stays
 * for any other redirect into this app that hasn't been updated to carry that param, or an
 * older/un-upgraded backend build. Under the default/modern "strict-origin-when-cross-origin"
 * referrer policy a same-or-upgraded-scheme cross-origin navigation still sends the referrer's
 * origin (not its full path) — but nothing is sent at all for a typed/bookmarked URL, which is
 * exactly the case the query param exists to cover. Returns "" when absent, not an http(s) URL,
 * or already same-origin as this app (nothing to override). Used by app/api/sso/route.js
 * (logged-in/known-user handoff) and proxy.js (brand-new/anonymous signup landing on
 * /{school}/enrollment/{program} with no SSO involved).
 */
export function detectOriginatingBackend(request) {
  if (!isBackendOverrideAllowed()) return "";
  const referer = request.headers.get("referer") || "";
  try {
    const refererUrl = new URL(referer);
    if (!/^https?:$/.test(refererUrl.protocol)) return "";
    if (refererUrl.origin === new URL(request.url).origin) return "";
    return refererUrl.origin;
  } catch {
    return "";
  }
}

/** Client-only read (document.cookie). Returns "" when absent/not allowed/on the server. */
export function getClientBackendOverride() {
  if (!isBackendOverrideAllowed() || typeof document === "undefined") return "";
  const match = document.cookie.match(new RegExp(`(?:^|; )${BACKEND_OVERRIDE_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "";
}

/** Client-only write/clear — used by the BackendSwitcher picker. */
export function setClientBackendOverride(url) {
  if (typeof document === "undefined") return;
  const trimmed = (url || "").trim().replace(/\/+$/, "");
  if (!trimmed) {
    document.cookie = `${BACKEND_OVERRIDE_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
    return;
  }
  document.cookie = `${BACKEND_OVERRIDE_COOKIE}=${encodeURIComponent(trimmed)}; Path=/; Max-Age=2592000; SameSite=Lax`;
}

/**
 * The REAL backend origin — never "" — for full-page navigations to a page
 * the Java app itself serves (its native login page, the legacy enrollment
 * continuation page, logout, ...). Used by loginPageUrl()/
 * legacyEnrollment*Url() below and directly by utils/logout.js.
 *
 * Deliberately NOT resolveBackendOrigin(): that one returns "" under
 * NEXT_PUBLIC_USE_LOCAL_PROXY so same-origin fetch()/XHR calls get forwarded
 * by next.config.mjs's rewrites() — exactly wrong for a navigation, which
 * must land on the Java app's own origin directly, not a relative path that
 * resolves against the Next.js app's own origin.
 *
 * Sync (not resolveServerBackendOrigin()'s async cookie read) since this is
 * called from both Server Components and client components; it only sees
 * the override when called from the client (document is defined) — a
 * Server Component call falls back to the configured default backend.
 */
export function resolveBackendNavigationOrigin() {
  return getClientBackendOverride() || process.env.NEXT_PUBLIC_BACKEND_BASE_URL;
}

/**
 * Resolves the prefix used by browser-facing backend requests.
 *
 * With the local proxy enabled, requests use the app origin directly.
 * next.config.mjs forwards paths that do not match a Next.js route to the
 * backend while keeping session cookies same-origin.
 */
export function resolveBackendOrigin() {
  const override = getClientBackendOverride();
  if (override) return override;
  const useLocalProxy = process.env.NEXT_PUBLIC_USE_LOCAL_PROXY === "true";
  if (useLocalProxy) return "";
  return process.env.NEXT_PUBLIC_BACKEND_BASE_URL;
}

export function hasBackendOrigin() {
  if (getClientBackendOverride()) return true;
  return process.env.NEXT_PUBLIC_USE_LOCAL_PROXY === "true" || Boolean(process.env.NEXT_PUBLIC_BACKEND_BASE_URL);
}

/**
 * Absolute URL for server-side callers (Server Actions, route handlers, the
 * proxy). Prefers BACKEND_BASE_URL — a server-only var (no NEXT_PUBLIC_
 * prefix) that never reaches client JS. Falls back to
 * NEXT_PUBLIC_BACKEND_BASE_URL, or, in local-proxy mode, this app's own
 * origin (APP_ORIGIN; NEXTAUTH_URL is still read as its old name).
 */
export async function resolveServerBackendOrigin() {
  if (isBackendOverrideAllowed()) {
    const { cookies } = await import("next/headers");
    const override = (await cookies()).get(BACKEND_OVERRIDE_COOKIE)?.value;
    if (override) return override;
  }
  if (process.env.BACKEND_BASE_URL) return process.env.BACKEND_BASE_URL;
  const useLocalProxy = process.env.NEXT_PUBLIC_USE_LOCAL_PROXY === "true";
  if (!useLocalProxy) return process.env.NEXT_PUBLIC_BACKEND_BASE_URL;
  return process.env.APP_ORIGIN || process.env.NEXTAUTH_URL;
}

/**
 * The Java app's own login page for a school (http://localhost:8080/{school}/common/login). It must
 * be served by the Java app itself, not through Next.js, so this uses the real backend origin and
 * not the "/backend" dev proxy. Safe for both server and client callers.
 */
export function loginPageUrl(schoolUUID) {
  const backend = resolveBackendNavigationOrigin();
  return schoolUUID && backend ? `${backend}/${schoolUUID}/common/login` : "/";
}

export function withLoginPayload(url, email, password) {
  if (!url || !email || !password) return url;
  const bytes = new TextEncoder().encode(JSON.stringify({ email, password }));
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  const payload = btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${url}${url.includes("?") ? "&" : "?"}payload=${payload}`;
}

/**
 * Appends a Base64URL JSON `payload` ({email, password}) to a Java login/logout URL. The Java login page
 * prefills from it when the cross-domain cookie (api/add-enrollment/login-credentials) can't reach it.
 */
export function withLoginPayload(url, email, password) {
  if (!url || !email || !password) return url;
  const bytes = new TextEncoder().encode(JSON.stringify({ email, password }));
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  const payload = btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${url}${url.includes("?") ? "&" : "?"}payload=${payload}`;
}

/**
 * The Java app's own legacy enrollment continuation page
 * (http://localhost:8080/{school}/student/enrollment/process/{uniqueId}) — where a
 * student belongs when CONFIGURATION/ENROLLMENT_VIA_NEXTJS is off and this Next.js
 * wizard must not run. Like loginPageUrl() it is a JSP page the Java app has to
 * serve itself, so it uses the real backend origin and not the dev proxy. Returns
 * "" when anything needed to build it is missing, so callers can skip the redirect.
 */
export function legacyEnrollmentProcessUrl(schoolUUID, uniqueId) {
  const backend = resolveBackendNavigationOrigin();
  if (!backend || !schoolUUID || !uniqueId) return "";
  return `${backend}/${schoolUUID}/student/enrollment/process/${encodeURIComponent(uniqueId)}`;
}

/**
 * Public legacy enrollment start page for a school/program. The original
 * signup query is forwarded intact because the JSP reads values such as
 * payload, referralCode, ras, and v directly from the URL.
 */
export function legacyEnrollmentSignupUrl(schoolUUID, program, query = "") {
  const backend = resolveBackendNavigationOrigin();
  if (!backend || !schoolUUID || !program) return "";
  const base = `${backend.replace(/\/+$/, "")}/${encodeURIComponent(schoolUUID)}/student/enrollment/${encodeURIComponent(program)}`;
  return query ? `${base}?${query}` : base;
}
