import { encodePayload, encodeRawString } from "@/utils/payloadEncoding";
import { resolveServerBackendOrigin } from "@/utils/backendOrigin";
import { getHash, getSystemTimezone } from "@/utils/common";

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
