import { NextResponse } from "next/server";
import { heldAccounts, isAccountId } from "@/lib/auth/accountCookies";

/**
 * GET /api/session/alive with header X-Account: <uniqueId>: does this browser still hold a login for that user?
 * The sign-in cookies are HttpOnly, so a tab cannot look for them itself. When the same user logs out in another
 * tab the cookies are gone and this answers { alive: false }: the dashboard then shows its "session logged out"
 * dialog instead of letting a click on a menu item fail (a page request would be redirected to the login page).
 * Not under the proxy's matcher, so it is never redirected itself.
 */
export async function GET(request) {
  const account = request.headers.get("x-account");
  const noStore = { headers: { "Cache-Control": "no-store" } };
  if (!isAccountId(account)) return NextResponse.json({ alive: true }, noStore);
  const alive = heldAccounts(request.cookies).some((a) => a.account === account);
  return NextResponse.json({ alive }, noStore);
}
