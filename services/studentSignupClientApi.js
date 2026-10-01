import { hasBackendOrigin, resolveBackendOrigin } from "@/utils/backendOrigin";

/**
 * The Student Signup endpoint that cannot go through
 * services/studentSignupApi.js's Server Action layer, because it is not a
 * programmatic JSON fetch a server could make on the browser's behalf:
 *   - getCaptchaImageUrl returns an <img src> URL; the browser's own image
 *     request is what carries the session cookie the backend's captcha
 *     challenge is bound to.
 * Kept in their own client-safe module (no next/headers import) so they can
 * still be imported by "use client" components — services/studentSignupApi.js
 * itself is server-only and would break the client bundle if imported here.
 */

function backendUrl(schoolUUID, path) {
  const baseUrl = resolveBackendOrigin();
  if (!hasBackendOrigin() || !schoolUUID) {
    throw new Error("A backend origin and a schoolUUID (from the URL) are required");
  }
  return `${baseUrl}/${schoolUUID}/${path}`;
}

/**
 * Not JSON — a captcha image. `cacheBust` should change (e.g. Date.now())
 * whenever the visible captcha needs to change, matching refreshCaptcha()'s
 * behavior of reloading the <img> with a new query param.
 */
export function getCaptchaImageUrl(schoolUUID, cacheBust) {
  const color = process.env.NEXT_PUBLIC_CATPCHA_COLOR || "2563eb";
  return `${backendUrl(schoolUUID, "api/v1/common/captcha.jpg")}?payload=${encodeURIComponent(color)}&v=${cacheBust}`;
}

