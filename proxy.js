import { NextResponse } from "next/server";
import { getBackendOverrideCookieName, isBackendOverrideAllowed } from "@/utils/backendOrigin";
import {
  ACCOUNT_HEADER,
  clearAccount,
  clearPick,
  heldAccounts,
  pickedAccount,
  writeAccount,
} from "@/lib/auth/accountCookies";
import { TokenError, refreshTokens, trustedBackend, verifyAccessToken } from "@/lib/auth/smsTokens";

/**
 * Browser sign-in for the protected routes (SMS plan section 27, Phase 4). Several users can be signed in
 * to one browser; each has its own token cookies (lib/auth/accountCookies.js). For each request this:
 *   1. picks the account the URL is for: the account chosen on /account/choose for exactly this path, a
 *      path segment equal to an account's UNIQUEUUID or numeric user id, else the browser's only account
 *      for this school; with several and nothing naming one it sends the browser to /account/choose;
 *   2. checks the account belongs to the school in the URL (first path segment);
 *   3. verifies its SMS access token, and when it has expired renews it at SMS with the refresh token and
 *      writes the new cookies onto the response;
 *   4. names the account to the page in the x-is-account request header (lib/auth/session.js reads it).
 * Nobody signed in: the school's login page on the Java app, as before. Proxy runs on Node.js (Next 16).
 */
export default async function proxy(request) {
  const path = request.nextUrl.pathname;
  const school = path.split("/")[1] || "";
  const accounts = heldAccounts(request.cookies).filter((a) => !a.profile?.schoolUUID || a.profile.schoolUUID === school);
  const forwarded = new Headers(request.headers);
  forwarded.delete(ACCOUNT_HEADER); // only this proxy may set it

  let entry = null;
  let clearPickCookie = false;
  const picked = pickedAccount(request.cookies, path);
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
function signedOut(request, school, account) {
  const response = toLogin(request, school);
  clearAccount(response.cookies, account);
  return response;
}

export const config = {
  matcher: [
    "/:school/enrollment/:program/step/:path*",
    "/:school/add-enrollment/:parentId/:sessionUserId/step/:path*",
  ],
};
