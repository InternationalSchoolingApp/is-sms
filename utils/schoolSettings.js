"use server";

import { encodePayload } from "@/utils/payloadEncoding";
import { hasBackendOrigin, resolveServerBackendOrigin } from "@/utils/backendOrigin";

/**
 * Mirrors jquery.commonFunction.js's getSchoolSettingsLinks() (is-rest-api,
 * src/main/resources/static/theme2/js/custom/jquery.commonFunction.js:6911)
 * — same endpoint, same request shape. That JS calls
 * `POST {schoolId}/api/v1/links` with an AES-encoded `{schoolId: <numeric>}`
 * body (CommonController#getSchoolSettingLinks, is-rest-api), and returns
 * the raw SchoolSettingsLinks entity JSON — field names are NOT renamed
 * here (termasOfUserUrl, studentPolicytUrl, etc. are the backend's actual,
 * typo'd column names — do not "fix" the spelling on this side).
 *
 * `schoolNumericId` (backend row id) goes in BOTH the URL path and the
 * request body — confirmed CommonController#getSchoolSettingLinks doesn't
 * even declare a `@PathVariable schoolId`, so that segment is only there
 * to satisfy the class-level `{schoolId}` route pattern and is otherwise
 * ignored server-side; the numeric id in the body is what actually
 * resolves the record. The UUID/slug from the URL is NOT used here at
 * all (unlike getPublicSchoolInfo in services/studentSignupApi.js, which
 * genuinely needs the UUID). See
 * app/[enrollmentFor]/[learningProgram]/page.jsx for
 * where schoolNumericId comes from (getPublicSchoolInfo resolving first).
 *
 * Deliberately NOT in services/studentSignupApi.js: that file is scoped to
 * confirmed Student Signup flow endpoints under {schoolId}/student/... and
 * {schoolId}/api/v1/student/...; this hits the separate, generic
 * {schoolId}/api/v1/links endpoint shared across the whole JSP app, not
 * signup-specific.
 */
export async function getSchoolSettingsLinks(schoolNumericId) {
  const baseUrl = await resolveServerBackendOrigin();
  if (!hasBackendOrigin()) {
    throw new Error("A backend origin (NEXT_PUBLIC_BACKEND_BASE_URL) is required");
  }
  // Comes from getPublicSchoolInfo() (services/studentSignupApi.js)
  // resolving first — if that failed or hasn't resolved yet, sending
  // schoolId: undefined would encode to an empty payload and/or hit a
  // route the backend can't resolve. Fail fast with a clear error instead
  // of a cryptic "Unexpected end of JSON input".
  if (schoolNumericId == null) {
    throw new Error("getSchoolSettingsLinks: schoolNumericId is required (getPublicSchoolInfo must resolve first)");
  }

  const response = await fetch(`${baseUrl}/${schoolNumericId}/api/v1/links`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payload: encodePayload({ schoolId: schoolNumericId }) }),
  });
  // A non-2xx response (e.g. a 404) can still have a valid-JSON body —
  // Spring's default error page is JSON — so `response.ok` must be
  // checked explicitly; parsing alone would "succeed" with a useless,
  // wrong-shaped object instead of surfacing the failure.
  if (!response.ok) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Mirrors CommonController#getSchoolSettingTechnical (is-rest-api,
 * src/main/java/com/c2e/is/v1/controller/CommonController.java:570-580) —
 * same `POST {schoolId}/api/v1/technical` endpoint, same AES-encoded
 * `{schoolId: <numeric>}` body as getSchoolSettingsLinks above. Returns the
 * raw SchoolSettingsTechnical entity JSON — the field of interest for
 * per-school theming is `parentColor`, a JSON *string* (not an object) whose
 * `rootcss` key holds a literal block of CSS (custom properties/rules) the
 * legacy JSP injects verbatim as a <style> tag (BaseController.java:1044,
 * jquery.commonFunction.js:929). Use utils/schoolColorTheme.js's
 * extractRootCss() to parse it rather than JSON-parsing `parentColor`
 * inline at each call site.
 */
export async function getSchoolSettingsTechnical(schoolNumericId) {
  const baseUrl = await resolveServerBackendOrigin();
  if (!hasBackendOrigin()) {
    throw new Error("A backend origin (NEXT_PUBLIC_BACKEND_BASE_URL) is required");
  }
  if (schoolNumericId == null) {
    throw new Error("getSchoolSettingsTechnical: schoolNumericId is required (getPublicSchoolInfo must resolve first)");
  }

  const response = await fetch(`${baseUrl}/${schoolNumericId}/api/v1/technical`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payload: encodePayload({ schoolId: schoolNumericId }) }),
  });
  if (!response.ok) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
