import { NextResponse } from "next/server";
import { heldAccounts, isAccountId, writePick } from "@/lib/auth/accountCookies";

/** Only a path of this app: one leading slash, no scheme, no second slash or backslash. */
function safeReturn(value) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\") || value.includes("://")) {
    return "/";
  }
  return value;
}

/** GET /api/session/pick?account=&return=: the account chosen on /account/choose, used for that one page. */
export async function GET(request) {
  const account = request.nextUrl.searchParams.get("account");
  const back = safeReturn(request.nextUrl.searchParams.get("return"));
  const response = NextResponse.redirect(new URL(back, request.url), 303);
  response.headers.set("Cache-Control", "no-store");
  if (isAccountId(account) && heldAccounts(request.cookies).some((a) => a.account === account)) {
    writePick(response.cookies, account, back.split("?")[0]);
  }
  return response;
}
