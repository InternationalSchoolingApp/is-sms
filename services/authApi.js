import { encodePayload, encodeRawString } from "@/utils/payloadEncoding";
import { resolveServerBackendOrigin } from "@/utils/backendOrigin";
import { getHash, getSystemTimezone } from "@/utils/common";

/**
 * Exchanges a one-time SSO token (issued by the legacy Java login page,
 * Login.jsp, when a STUDENT with an in-progress enrollment logs in there)
 * for that user's identity — the backend invalidates the token after this
 * call, so it can only ever be exchanged once. Called only from
 * auth.js's "sso-token" CredentialsProvider (server-side, inside
 * app/api/sso/route.js's signIn() call), same reasoning as login() above
 * for using resolveServerBackendOrigin() instead of the browser-facing one.
 *
 * Endpoint: POST {schoolId}/api/v1/common/sso/exchange — CommonController
 * (where this endpoint and loginUser() both live) has a class-level
 * {schoolId} path prefix, so — same as login() above — schoolUUID must be
 * included even though it wasn't obvious the caller (app/api/sso/route.js)
 * would need it: the backend puts it in the SSO redirect URL's own `school`
 * query param specifically so this call can include it (see
 * CommonUtil#getLogin's SSO branch on the backend).
 *
 * @param {string} schoolUUID
 * @param {string} ssoToken
 * @returns {Promise<{status: string, uniqueId?: string, userId?: number,
 *   userLoginHash?: string, schoolUUID?: string, schoolNumericId?: number,
 *   schoolName?: string, message?: string}|null>}
 */
export async function exchangeSsoToken(schoolUUID, ssoToken) {
  const baseUrl = resolveServerBackendOrigin();
  if (!baseUrl || !schoolUUID || !ssoToken) {
    console.error("exchangeSsoToken: missing baseUrl, schoolUUID or ssoToken", {
      baseUrl,
      schoolUUID,
      hasToken: !!ssoToken,
    });
    return null;
  }

  const url = `${baseUrl}/${schoolUUID}/api/v1/common/sso/exchange`;
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payload: encodePayload({ ssoToken }) }),
    });
  } catch (err) {
    console.error("exchangeSsoToken: fetch threw", url, err);
    return null;
  }

  // Temporary diagnostic — this is the first live run of this path; remove
  // once the handoff is confirmed working end to end.
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    console.error("exchangeSsoToken: non-OK response", url, response.status, text);
    return null;
  }
  return response.json();
}

/**
 * Login endpoint, confirmed from CommonController.loginUser()
 * (POST {schoolId}/api/v1/common/login). Request/response shapes confirmed
 * from LoginDTO.java / LoginResponse.java and getRequestForLogin() in
 * login.js — not guessed.
 *
 * IMPORTANT: the backend reads the captcha value from the SAME HttpSession
 * that generated the captcha image (`session.getAttribute("captcha")`).
 * This call must be made with the session cookie that was present when the
 * captcha image was fetched — i.e. it must go through the SAME origin as
 * the captcha <img>, or the captcha will never validate. See
 * utils/backendOrigin.js and next.config.mjs's rewrites() for the local-dev
 * same-origin proxy that makes this work; in production this needs the
 * real reverse proxy from Step 2 (infra-managed, not built here).
 *
 * IMPORTANT (confirmed via a live server stack trace, not guessed):
 * `Authentication.schoolId` is typed `Integer` in the backend — the
 * NUMERIC school row id (e.g. 1 for the default/primary school), a
 * DIFFERENT value from `schoolUUID` (the string slug used in URL paths).
 * Sending the UUID string into `schoolId` throws a Jackson
 * InvalidFormatException server-side and the whole request 500s.
 *
 * @param {{email: string, password: string, captcha: string, schoolUUID: string, schoolNumericId: number}} fields
 *   `schoolUUID` here is the URL-path slug/UUID; `schoolNumericId` is the
 *   backend's numeric row id — do not conflate them.
 * @param {{cookie?: string}} [serverOptions] pass the incoming request's Cookie
 *   header here when calling this from a server context (e.g. next-auth's
 *   authorize()), so the backend sees the browser's session, not a fresh one.
 *
 * This function only ever runs server-side, inside next-auth's authorize()
 * (route.js) — it deliberately uses resolveServerBackendOrigin(), NOT the
 * plain resolveBackendOrigin() every browser-facing caller uses, because
 * that one has no page origin to resolve "/backend" against outside a
 * browser (and switching it based on `typeof window` broke SSR/hydration
 * elsewhere — see utils/backendOrigin.js's doc comments).
 */
export async function login(
  { email, password, captcha, schoolUUID, schoolNumericId, userType = "STUDENT" },
  serverOptions = {}
) {
  console.log("LOGIN FUNCTION CALLED");
  const baseUrl = resolveServerBackendOrigin();
  if (!baseUrl || !schoolUUID || !schoolNumericId) {
    throw new Error("NEXT_PUBLIC_BACKEND_BASE_URL, schoolUUID and schoolNumericId are all required");
  }

  const request = {
    authentication: {
      hash: getHash(),
      schoolId: schoolNumericId,
      schoolUUID,
      userType,
    },
    login: {
      timezone: getSystemTimezone(),
      userName: email,
      password: encodeRawString(password), // double-encoded, same as signup — see payloadEncoding.js
      captcha: (captcha || "").toUpperCase().trim(),
      location: "{}",
      fromSpoof: "",
    },
  };

  const headers = { "Content-Type": "application/json" };
  if (serverOptions.cookie) {
    headers.Cookie = serverOptions.cookie;
  }

  const response = await fetch(`${baseUrl}/${schoolUUID}/api/v1/common/login`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify({ payload: encodePayload(request) }),
  });

  return response.json();
}
