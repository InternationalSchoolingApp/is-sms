import { NextResponse } from "next/server";
import {
  detectOriginatingBackend,
  getBackendOverrideCookieName,
  isBackendOverrideAllowed,
  parseBackendOrigin,
} from "@/utils/backendOrigin";
import {
  ACCOUNT_HEADER,
  TAB_ACCOUNT_HEADER,
  clearAccount,
  clearPick,
  heldAccounts,
  isAccountId,
  pickedAccount,
  writeAccount,
} from "@/lib/auth/accountCookies";
import { RENEWED_ELSEWHERE, TokenError, refreshTokens, trustedBackend, verifyAccessToken } from "@/lib/auth/smsTokens";

/**
 * Browser sign-in for the protected routes (SMS plan section 27, Phase 4). Several users can be signed in
 * to one browser; each has its own token cookies (lib/auth/accountCookies.js). For each request this:
 *   1. picks the account the request is for, as SMS does (no URL change): the X-Account header the tab's own
 *      calls carry (server actions, step navigations; components/auth/TabAccount.jsx), the account chosen on
 *      /account/choose for exactly this path, a path segment equal to an account's UNIQUEUUID or numeric user
 *      id, else the browser's only account for this school; with several and nothing naming one it sends the
 *      browser to /account/choose. Naming an account the browser holds no cookie for signs nobody in;
 *   2. checks the account belongs to the school in the URL (first path segment);
 *   3. verifies its SMS access token, and when it has expired renews it at SMS with the refresh token and
 *      writes the new cookies onto the response;
 *   4. names the account to the page in the x-is-account request header (lib/auth/session.js reads it).
 * Nobody signed in: the school's login page on the Java app, as before. Proxy runs on Node.js (Next 16).
 */
export default async function proxy(request) {
  const path = request.nextUrl.pathname;
  const segments = path.split("/").filter(Boolean);

  // Payment gateway return pages (full page loads, so no X-Account header). With several accounts in the
  // browser getAccountSession() cannot tell whose page this is and answers "signed out", which sent the
  // payer to login instead of the thank-you page. The Add Another Student return URL names its account:
  // sessionUserId (query, or glued onto the path's UNIQUEUUID segment on the failure URL).
  if (PAYMENT_RESPONSE_PATH.test(path)) return await paymentReturn(request, path);
  if (segments.includes("common")) return NextResponse.next(); // matched only for the payment returns above

  // Pre-login landing page (/{school}/enrollment/{program} — exactly school/enrollment/program,
  // nothing after; the protected wizard below additionally has /step/...). A UAT backend can send a
  // brand-new/anonymous student straight here (ClientSignupStudentController#commonSignupContent,
  // no `user` found yet) without going through /api/sso at all, so unlike the SSO handoff nothing has
  // told this app which of the several UAT backend instances that was. That controller (like
  // getFinalEnrollmentUrl for the SSO handoff) appends an explicit `backend` query param for exactly
  // this — prefer it, falling back to the Referer-based detection (absent for a typed/bookmarked URL,
  // which is exactly why the query param exists) for an older/un-upgraded backend build. Persist
  // whichever one fires the same way the manual UAT picker does
  // (components/common/BackendSwitcher.jsx) — otherwise this student's calls (and the picker's own
  // display) silently fall back to the default backend instead of the one that sent them.
  if (segments.length === 3 && segments[1] === "enrollment") {
    const backendParam = isBackendOverrideAllowed() ? parseBackendOrigin(request.nextUrl.searchParams.get("backend")) : "";
    const backendOverride = backendParam || detectOriginatingBackend(request);
    if (!backendOverride) return NextResponse.next();
    let response;
    if (backendParam) {
      const cleanUrl = new URL(request.url);
      cleanUrl.searchParams.delete("backend");
      response = NextResponse.redirect(cleanUrl);
    } else {
      response = NextResponse.next();
    }
    response.cookies.set(getBackendOverrideCookieName(), backendOverride, {
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "lax",
    });
    return response;
  }

  const school = path.split("/")[1] || "";
  const accounts = heldAccounts(request.cookies).filter((a) => !a.profile?.schoolUUID || a.profile.schoolUUID === school);
  const forwarded = new Headers(request.headers);
  forwarded.delete(ACCOUNT_HEADER); // only this proxy may set it

  let entry = null;
  let clearPickCookie = false;
  const named = request.headers.get(TAB_ACCOUNT_HEADER);
  if (isAccountId(named)) {
    // The tab says whose page this is. Never fall back to another account: the tab would then save its form
    // into someone else's enrollment.
    entry = accounts.find((a) => a.account === named) || null;
    if (!entry) return toLogin(request, school);
  }
  const picked = entry ? null : pickedAccount(request.cookies, path);
  if (picked) {
    entry = accounts.find((a) => a.account === picked) || null;
    clearPickCookie = true;
  }
  if (!entry) {
    const segments = path.split("/").filter(Boolean);
    entry = accounts.find((a) => segments.includes(a.account)) || null;
    if (!entry) {
      entry = accounts.find((a) => a.profile?.userId && segments.includes(String(a.profile.userId))) || null;
    }
  }
  if (!entry && accounts.length === 1) entry = accounts[0];
  if (!entry && accounts.length > 1) {
    const choose = new URL("/account/choose", request.url);
    choose.searchParams.set("return", path + request.nextUrl.search);
    choose.searchParams.set("school", school);
    return NextResponse.redirect(choose);
  }
  if (!entry) return toLogin(request, school);

  const backend = trustedBackend(entry.profile?.backend);
  let accessToken = entry.accessToken;
  let renewed = null;
  try {
    await verifyAccessToken(accessToken, backend);
  } catch (err) {
    if (!(err instanceof TokenError) || err.reason !== "expired" || !entry.refreshToken) {
      return signedOut(request, school, entry.account);
    }
    renewed = await refreshTokens(backend, school, entry.refreshToken).catch(() => null);
    if (renewed === RENEWED_ELSEWHERE) return retryShortly(request);
    if (!renewed) return signedOut(request, school, entry.account);
    accessToken = renewed.accessToken;
  }

  forwarded.set(ACCOUNT_HEADER, entry.account);
  if (renewed) {
    // The page reads the cookie through cookies(); pass the renewed token on in this request too.
    forwarded.set("cookie", replaceCookie(request.headers.get("cookie") || "", `__Host-ISX_AT_${entry.account}`, accessToken));
  }
  const response = NextResponse.next({ request: { headers: forwarded } });
  if (renewed) writeAccount(response.cookies, entry.account, renewed);
  if (clearPickCookie) clearPick(response.cookies);
  return response;
}

const PAYMENT_RESPONSE_PATH = /^(?:\/[^/]+)?\/common\/(?:[a-z-]*payment-response-(?:success|failure))(?:\/|$)/;

async function paymentReturn(request, path) {
  const accounts = heldAccounts(request.cookies);
  const glued = new URLSearchParams(decodeURIComponent(path).split("&").slice(1).join("&"));
  const named = request.nextUrl.searchParams.get("sessionUserId") || glued.get("sessionUserId");
  const entry = isAccountId(named) ? accounts.find((a) => a.account === named) : accounts.length === 1 ? accounts[0] : null;
  // TEMP DEBUG [pay-debug]: what the payment-return proxy saw
  console.warn("[pay-debug] proxy return", { path, held: accounts.length, named: named || null, picked: entry?.account || null, hasRefresh: Boolean(entry?.refreshToken) });
  if (!entry) return NextResponse.next();

  // Renew an expired access token HERE: the page cannot persist renewed cookies (Server Components have a
  // read-only cookie store) and the refresh token is one-time, so renewing in the page's own render used up the
  // refresh token without saving the new one, and the next call found the login "ended" -> login page.
  const backend = trustedBackend(entry.profile?.backend);
  let accessToken = entry.accessToken;
  let renewed = null;
  try {
    await verifyAccessToken(accessToken, backend);
  } catch (err) {
    console.warn("[pay-debug] proxy verify failed", { reason: err?.reason, message: err?.message });
    if (!(err instanceof TokenError) || err.reason !== "expired" || !entry.refreshToken) return NextResponse.next();
    renewed = await refreshTokens(backend, entry.profile?.schoolUUID, entry.refreshToken).catch((e) => {
      console.warn("[pay-debug] proxy refresh threw", e?.message);
      return null;
    });
    console.warn("[pay-debug] proxy refresh result", renewed === RENEWED_ELSEWHERE ? "renewed-elsewhere" : renewed ? "renewed" : "refused");
    if (!renewed || renewed === RENEWED_ELSEWHERE) return NextResponse.next();
    accessToken = renewed.accessToken;
  }
  const forwarded = new Headers(request.headers);
  forwarded.delete(ACCOUNT_HEADER);
  forwarded.set(ACCOUNT_HEADER, entry.account);
  if (renewed) forwarded.set("cookie", replaceCookie(request.headers.get("cookie") || "", `__Host-ISX_AT_${entry.account}`, accessToken));
  const response = NextResponse.next({ request: { headers: forwarded } });
  if (renewed) writeAccount(response.cookies, entry.account, renewed);
  return response;
}

function replaceCookie(header, name, value) {
  const parts = header.split(/;\s*/).filter((p) => p && !p.startsWith(`${name}=`));
  parts.push(`${name}=${value}`);
  return parts.join("; ");
}

function toLogin(request, school) {
  const override = isBackendOverrideAllowed() ? request.cookies.get(getBackendOverrideCookieName())?.value : undefined;
  const backend = override || process.env.NEXT_PUBLIC_BACKEND_BASE_URL;
  if (school && backend) return NextResponse.redirect(`${backend}/${school}/common/login`);
  return NextResponse.redirect(new URL("/", request.url));
}

/** The account's login has ended (revoked, reused, or never valid): forget it and go to login. */
/**
 * Another request renewed this login a moment ago and its response carries the new cookies. Wait as SMS asks
 * (Retry-After: 1), then send the browser to the same URL: 307 keeps the method and body, so a server action is
 * repeated as sent, now with the new cookies.
 */
async function retryShortly(request) {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return NextResponse.redirect(request.nextUrl, 307);
}

function signedOut(request, school, account) {
  const response = toLogin(request, school);
  clearAccount(response.cookies, account);
  return response;
}

export const config = {
  matcher: [
    "/:school/enrollment/:program",
    "/:school/enrollment/:program/step/:path*",
    "/:school/add-enrollment/:parentId/:sessionUserId/step/:path*",
    "/common/:path*",
    "/:school/common/:path*",
  ],
};
