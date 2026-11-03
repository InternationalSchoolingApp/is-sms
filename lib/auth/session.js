import { cookies, headers } from "next/headers";
import { ACCOUNT_HEADER, TAB_ACCOUNT_HEADER, heldAccounts, isAccountId, writeAccount } from "@/lib/auth/accountCookies";
import { RENEWED_ELSEWHERE, TokenError, refreshTokens, trustedBackend, verifyAccessToken } from "@/lib/auth/smsTokens";

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
  let accessToken = entry.accessToken;
  let claims;
  try {
    claims = await verifyAccessToken(accessToken, backend);
  } catch (err) {
    // The access token lives 15 minutes. proxy.js renews it on the navigations it
    // matches, but a server action fired on an idle page (a refetch, a poll) can
    // find it expired with no navigation in between: this used to answer null, so
    // no Authorization header went out and SMS refused the call. An expired token
    // is not an ended login — spend the refresh token and carry on.
    const renewed = err instanceof TokenError && err.reason === "expired" && entry.refreshToken
      ? await refreshTokens(backend, entry.profile?.schoolUUID, entry.refreshToken).catch(() => null)
      : null;
    // null = SMS ended this login; RENEWED_ELSEWHERE = another request already
    // rotated it and holds the new cookies, so this one has nothing usable.
    if (!renewed || renewed === RENEWED_ELSEWHERE) return null;
    accessToken = renewed.accessToken;
    try {
      claims = await verifyAccessToken(accessToken, backend);
    } catch {
      return null;
    }
    try {
      writeAccount(store, entry.account, { ...renewed, profile: entry.profile });
    } catch {
      // Server Components get a read-only cookie store. The renewed token still
      // serves this request; the next one renews again rather than failing.
    }
  }
  if (claims.uniqueId !== entry.account) return null;
  return {
    uniqueId: claims.uniqueId,
    userId: claims.userId,
    schoolUUID: entry.profile?.schoolUUID || "",
    schoolNumericId: claims.schoolNumericId,
    schoolName: entry.profile?.schoolName || "",
    email: entry.profile?.email || "",
    role: claims.role,
    accessToken,
    backend,
  };
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
