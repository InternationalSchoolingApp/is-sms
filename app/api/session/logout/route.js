import { NextResponse } from "next/server";
import { clearAccount, heldAccounts, isAccountId } from "@/lib/auth/accountCookies";
import { logoutAtSms, trustedBackend } from "@/lib/auth/smsTokens";

/**
 * POST /api/session/logout with header X-Account: <uniqueId> (or ?account=): signs that one user out of
 * this browser. Ends the login at SMS and clears the account's cookies; other users in other tabs stay
 * signed in. Same-origin POST only (SameSite=Lax cookies are not sent on a cross-site POST).
 */
export async function POST(request) {
  const account = request.headers.get("x-account") || request.nextUrl.searchParams.get("account");
  if (!isAccountId(account)) {
    return NextResponse.json({ error: "invalid_request", error_description: "Unknown account" }, { status: 400 });
  }
  const entry = heldAccounts(request.cookies).find((a) => a.account === account);
  const response = NextResponse.json({ status: "logged_out" }, { headers: { "Cache-Control": "no-store" } });
  if (entry) {
    await logoutAtSms(trustedBackend(entry.profile?.backend), entry.profile?.schoolUUID, entry.refreshToken);
    clearAccount(response.cookies, account);
  }
  return response;
}
