import { trackRequest } from "@/utils/loaderStore";
import { encodePayload } from "@/utils/payloadEncoding";
import { hasBackendOrigin, resolveBackendOrigin } from "@/utils/backendOrigin";

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
  const baseUrl = resolveBackendOrigin();
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

  const response = await trackRequest(() =>
    fetch(`${baseUrl}/${schoolNumericId}/api/v1/links`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ payload: encodePayload({ schoolId: schoolNumericId }) }),
    })
  );
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
