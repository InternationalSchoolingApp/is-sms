/**
 * Keeps the SMS access token fresh inside the Auth.js JWT.
 *
 * SMS hands out a short-lived access token (15 minutes) and a one-time refresh token: every refresh returns a NEW
 * refresh token and the old one stops working. Presenting an old one again after a short grace window is treated
 * as theft and ends the whole login. So two rules matter here:
 *
 *   1. Concurrent refreshes in one server process must share ONE call. createRefresher() keeps the in-flight
 *      promise per refresh token, and keeps the settled one for a few seconds, so requests that raced with the
 *      first (and still carry the old cookie) get the same new tokens instead of replaying the old refresh token.
 *   2. Refresh only where the new tokens will be written back to the cookie: the /api/auth/session route that the
 *      SessionProvider polls, and the proxy. Never from a Server Action. That is why Server Actions are given the
 *      access token by the page (in the request payload) and never refresh it themselves.
 *
 * No imports and no side effects, so it can be checked with plain Node (scripts/verifyTokenRefresh.mjs).
 */

/** Refresh when the access token has less than this left; the session is polled more often than this. */
export const REFRESH_MARGIN_MS = 5 * 60 * 1000;

/** How long a settled refresh stays shared with callers that raced it. */
export const SHARE_SETTLED_MS = 5_000;

/** SMS names its fields snake_case on /auth/refresh and camelCase on the SSO exchange; accept both. */
export function normalizeTokens(body) {
  if (!body) return null;
  const accessToken = body.access_token ?? body.accessToken;
  const refreshToken = body.refresh_token ?? body.refreshToken;
  const expiresIn = body.expires_in ?? body.expiresIn;
  if (!accessToken || !refreshToken || !expiresIn) return null;
  return { accessToken, refreshToken, expiresIn: Number(expiresIn) };
}

/** Puts a fresh pair of tokens into the JWT and clears any earlier token error. */
export function applyTokens(token, body, now = Date.now()) {
  const tokens = normalizeTokens(body);
  if (!tokens) return token;
  const { tokenError, ...rest } = token;
  return {
    ...rest,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    accessTokenExpires: now + tokens.expiresIn * 1000,
  };
}

/** True when there are tokens and the access token is about to expire, or has. */
export function needsRefresh(token, now = Date.now()) {
  return Boolean(token?.refreshToken && token?.accessTokenExpires && now >= token.accessTokenExpires - REFRESH_MARGIN_MS);
}

/**
 * @param {{refresh: (token: object) => Promise<{status: number, body?: object}>,
 *          now?: () => number, shareMs?: number}} deps
 *   refresh performs POST /{school}/auth/refresh for the token's refresh token.
 * @returns {(token: object) => Promise<object>} resolves to the JWT to keep; it never rejects.
 */
export function createRefresher({ refresh, now = Date.now, shareMs = SHARE_SETTLED_MS }) {
  const inFlight = new Map();

  async function run(token) {
    let result;
    try {
      result = await refresh(token);
    } catch {
      return { ...token, tokenError: "RefreshFailed" }; // network trouble: keep the tokens, try again next time
    }
    const status = result?.status;
    if (status === 200 && normalizeTokens(result.body)) return applyTokens(token, result.body, now());
    if (status === 409) return { ...token, tokenError: "RefreshConflict" }; // another refresh of this login is finishing
    if (status === 400 || status === 401 || status === 403) {
      // expired, revoked, reused or the user is no longer active: there is nothing left to refresh
      return {
        ...token,
        accessToken: undefined,
        refreshToken: undefined,
        accessTokenExpires: undefined,
        tokenError: "RefreshTokenError",
      };
    }
    return { ...token, tokenError: "RefreshFailed" }; // 429, 5xx, anything unexpected
  }

  return function refreshOnce(token) {
    const key = token.refreshToken;
    let pending = inFlight.get(key);
    if (!pending) {
      pending = run(token);
      inFlight.set(key, pending);
      pending.finally(() => {
        const timer = setTimeout(() => inFlight.delete(key), shareMs);
        timer.unref?.();
      });
    }
    return pending;
  };
}
