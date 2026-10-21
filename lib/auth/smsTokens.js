import { createPublicKey, verify as verifySignature } from "node:crypto";
import { UAT_BACKEND_URLS } from "../../constant/UatBackendUrls.js";
import { isBackendOverrideAllowed } from "../../utils/backendOrigin.js";

/**
 * SMS access tokens, checked here the way SMS checks them: RS256 only, key by `kid` from SMS's
 * /.well-known/jwks.json (cached 5 minutes), issuer, audience and expiry (30 s skew). Also the calls to
 * SMS's /auth/refresh and /auth/logout. Server-only.
 *
 * Which SMS: the backend the login came from (kept in the account's profile cookie), but only if it is
 * this deployment's backend (BACKEND_BASE_URL / NEXT_PUBLIC_BACKEND_BASE_URL) or, on UAT, one of
 * UAT_BACKEND_URLS: a cookie must never be able to name the key server.
 */

const ISSUER = process.env.SMS_TOKEN_ISSUER || "is-sms";
const AUDIENCE = process.env.SMS_TOKEN_AUDIENCE || "is-sms-api";
const SKEW_SECONDS = 30;
const JWKS_TTL_MS = 5 * 60 * 1000;
const jwksCache = new Map();
const refreshing = new Map();

export function defaultBackend() {
  return process.env.BACKEND_BASE_URL || process.env.NEXT_PUBLIC_BACKEND_BASE_URL || "";
}

/** The backend to trust for an account: its recorded backend if allowed, else this deployment's. */
export function trustedBackend(recorded) {
  const fallback = defaultBackend();
  if (!recorded || recorded === fallback) return fallback;
  if (isBackendOverrideAllowed() && UAT_BACKEND_URLS.includes(recorded)) return recorded;
  return fallback;
}

export class TokenError extends Error {
  constructor(reason, message) {
    super(message || reason);
    this.reason = reason; // "expired" | "invalid"
  }
}

function decodePart(part) {
  return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
}

async function jwks(backend) {
  const hit = jwksCache.get(backend);
  if (hit && hit.until > Date.now()) return hit.keys;
  const response = await fetch(`${backend}/.well-known/jwks.json`, { cache: "no-store" });
  if (!response.ok) throw new Error(`JWKS ${response.status}`);
  const body = await response.json();
  const keys = new Map();
  for (const jwk of body.keys || []) {
    if (jwk.kty === "RSA" && jwk.kid) keys.set(jwk.kid, createPublicKey({ key: jwk, format: "jwk" }));
  }
  jwksCache.set(backend, { keys, until: Date.now() + JWKS_TTL_MS });
  return keys;
}

/**
 * The claims of a valid SMS access token: { userId, uniqueId, schoolNumericId, role, sid, exp }.
 * Throws TokenError("expired") when only the expiry fails, TokenError("invalid") otherwise.
 */
export async function verifyAccessToken(token, backend) {
  const parts = typeof token === "string" ? token.split(".") : [];
  if (parts.length !== 3) throw new TokenError("invalid");
  let header;
  let claims;
  try {
    header = decodePart(parts[0]);
    claims = decodePart(parts[1]);
  } catch {
    throw new TokenError("invalid");
  }
  if (header.alg !== "RS256" || !header.kid) throw new TokenError("invalid");
  let keys = await jwks(backend);
  if (!keys.has(header.kid)) {
    jwksCache.delete(backend); // a new key after rotation
    keys = await jwks(backend);
  }
  const key = keys.get(header.kid);
  if (!key) throw new TokenError("invalid");
  const signed = verifySignature("RSA-SHA256", Buffer.from(`${parts[0]}.${parts[1]}`), key, Buffer.from(parts[2], "base64url"));
  if (!signed) throw new TokenError("invalid");
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (claims.iss !== ISSUER || !audiences.includes(AUDIENCE) || !claims.sub) throw new TokenError("invalid");
  const now = Math.floor(Date.now() / 1000);
  if (typeof claims.nbf === "number" && claims.nbf > now + SKEW_SECONDS) throw new TokenError("invalid");
  if (typeof claims.exp !== "number" || claims.exp + SKEW_SECONDS < now) throw new TokenError("expired");
  return {
    userId: Number(claims.sub),
    uniqueId: claims.uid,
    schoolNumericId: claims.sch,
    role: claims.role,
    sid: claims.sid,
    exp: claims.exp,
  };
}

/**
 * What refreshTokens gives when SMS answers 409 concurrent_refresh: another request (often on another server
 * instance, which this process cannot see) renewed this login a moment ago, and its response is bringing the
 * browser the new cookies. The login is fine; this request must not sign out or clear cookies.
 */
export const RENEWED_ELSEWHERE = Object.freeze({ renewedElsewhere: true });

/**
 * Rotates one login's tokens at SMS (POST /{school}/auth/refresh). Concurrent calls with the same refresh
 * token in this process share one call, so parallel requests of one tab do not trip SMS's reuse check.
 * @returns {Promise<{accessToken: string, refreshToken: string}|typeof RENEWED_ELSEWHERE|null>}
 *   null when SMS ended the login
 */
export function refreshTokens(backend, schoolUUID, refreshToken) {
  const key = `${backend}|${refreshToken}`;
  if (refreshing.has(key)) return refreshing.get(key);
  const call = (async () => {
    const response = await fetch(`${backend}/${schoolUUID}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: "no-store",
    });
    if (response.status === 409) return RENEWED_ELSEWHERE;
    if (!response.ok) return null;
    const body = await response.json();
    return body?.access_token && body?.refresh_token
      ? { accessToken: body.access_token, refreshToken: body.refresh_token }
      : null;
  })();
  refreshing.set(key, call);
  // A 409 is not kept: the browser's retry must reach SMS again, so that once SMS's 10 s grace has passed
  // a refresh token that never got replaced is refused (signed out) instead of being retried for longer.
  call.then(
    (result) => setTimeout(() => refreshing.delete(key), result === RENEWED_ELSEWHERE ? 0 : 10_000),
    () => setTimeout(() => refreshing.delete(key), 10_000),
  );
  return call;
}

/** Ends one login at SMS. Never throws: signing out here must work even if SMS cannot be reached. */
export async function logoutAtSms(backend, schoolUUID, refreshToken) {
  if (!backend || !schoolUUID || !refreshToken) return;
  try {
    await fetch(`${backend}/${schoolUUID}/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: "no-store",
    });
  } catch (err) {
    console.error("logoutAtSms failed:", err);
  }
}
