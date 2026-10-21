import { cookies, headers } from "next/headers";
import { ACCOUNT_HEADER, TAB_ACCOUNT_HEADER, heldAccounts, isAccountId } from "@/lib/auth/accountCookies";
import { trustedBackend, verifyAccessToken } from "@/lib/auth/smsTokens";

/**
 * The signed-in user of this request (server components, server actions, route handlers), or null.
 * proxy.js has already chosen the account for the URL, renewed its token if needed, and named it in the
 * x-is-account request header. Outside the proxy's routes: the account the tab names (X-Account, see
 * components/auth/TabAccount.jsx), else the browser's only account.
 *
 * Shape (what the old Auth.js session carried, plus the token for calls to SMS):
 *   { uniqueId, userId, schoolUUID, schoolNumericId, schoolName, email, role, accessToken, backend }
 */
export async function getAccountSession() {
  const store = await cookies();
  const requestHeaders = await headers();
  const tabAccount = requestHeaders.get(TAB_ACCOUNT_HEADER);
  const named = requestHeaders.get(ACCOUNT_HEADER) || (isAccountId(tabAccount) ? tabAccount : null);
  const accounts = heldAccounts(store);
  const entry = named ? accounts.find((a) => a.account === named) : accounts.length === 1 ? accounts[0] : null;
  if (!entry?.accessToken) return null;
  const backend = trustedBackend(entry.profile?.backend);
  try {
    const claims = await verifyAccessToken(entry.accessToken, backend);
    if (claims.uniqueId !== entry.account) return null;
    return {
      uniqueId: claims.uniqueId,
      userId: claims.userId,
      schoolUUID: entry.profile?.schoolUUID || "",
      schoolNumericId: claims.schoolNumericId,
      schoolName: entry.profile?.schoolName || "",
      email: entry.profile?.email || "",
      role: claims.role,
      accessToken: entry.accessToken,
      backend,
    };
  } catch {
    return null;
  }
}

/** The session without the token: what may be handed to client components. */
export function publicSession(session) {
  if (!session) return null;
  const { accessToken, backend, ...visible } = session;
  return visible;
}

/** The Authorization header for a call to SMS on behalf of this request's user (empty when nobody is signed in). */
export async function smsAuthHeaders() {
  const session = await getAccountSession();
  return session ? { Authorization: `Bearer ${session.accessToken}` } : {};
}

export { serviceKeyHeaders, withServiceKey } from "@/lib/auth/serviceKey";
import { serviceKeyHeaders } from "@/lib/auth/serviceKey";

/** fetch() options with the signed-in user's bearer token (and this server's service key) added. */
export async function withSmsAuth(init = {}) {
  const auth = await smsAuthHeaders();
  return { ...init, headers: { ...serviceKeyHeaders(), ...(init.headers || {}), ...auth } };
}
