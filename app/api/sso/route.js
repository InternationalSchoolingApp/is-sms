import { NextResponse } from "next/server";
import { signIn } from "@/auth";
import { DEFAULT_PROGRAM, stepPath } from "@/utils/wizardSteps";
import { addEnrollmentStepPath, normalizeAddSignupPage } from "@/utils/addEnrollmentSteps";
import { getLearningProgramRouteCode } from "@/constant/LearningPrograms";
import { getBackendOverrideCookieName, isBackendOverrideAllowed } from "@/utils/backendOrigin";

const VALID_STEPS = new Set(["1", "2", "3", "4"]);

/**
 * SSO handoff endpoint — the redirect target the legacy Java login page
 * (Login.jsp) sends a STUDENT with an in-progress enrollment to, instead of
 * its own JSP continuation page. Login itself still happens entirely on the
 * Java side; this only exchanges the one-time `token` it hands us for a
 * real Auth.js session (via the "sso-token" CredentialsProvider in auth.js
 * -> services/authApi.js's exchangeSsoToken), then forwards the browser on
 * to the actual wizard step the backend said to resume at.
 *
 * Expected URL: /api/sso?token=<oneTimeToken>&step=<1|2|3|4>&school=<schoolUUID>&program=<routeCode>
 * `step` is validated against the routes that actually exist and defaults
 * to "1" if missing/invalid — never trust it blindly as a redirect target.
 * `school` is required — see services/authApi.js's exchangeSsoToken doc
 * comment for why this route needs it despite not otherwise being
 * schoolId-scoped. `program` (added alongside CommonUtil#resolveProgramRouteCode
 * on the backend) is the student's actual enrollment program's short URL code
 * (constant/LearningPrograms.js) — validated against that same table and
 * falling back to DEFAULT_PROGRAM if missing/unrecognized, so a stale/old
 * backend build (or a hand-built URL) without this param still works exactly
 * as before.
 *
 * Handles BOTH GET and POST: Login.jsp's goAhead() (login.js) doesn't
 * navigate the browser via a plain link/redirect — it builds a real
 * `<form method="POST">` (carrying a `hash` field we don't need, since
 * token/step already ride the query string) and submits it, so this is hit
 * as a POST in practice. Both handlers share the same logic.
 */

/**
 * Validate an optional `next` redirect target. Only a same-origin RELATIVE
 * path scoped to this school is allowed (must start with "/{school}/"), so a
 * crafted `next` can never redirect the browser to another origin.
 * Returns the safe path or null.
 */
function safeNextPath(next, schoolUUID) {
  if (!next || typeof next !== "string") return null;
  // Reject absolute URLs and protocol-relative ("//evil.com") targets.
  if (!next.startsWith("/") || next.startsWith("//")) return null;
  if (!next.startsWith(`/${schoolUUID}/`)) return null;
  return next;
}
/**
 * Build /{school}/add-enrollment/{parentId}/{sessionUserId}/step/{slug} from the
 * two URL params. Both are validated into narrow character sets — a numeric id
 * and a uniqueId — so neither can smuggle a "/" or ".." into the path and send
 * the browser somewhere else. Returns null when either is unusable.
 *
 * `step` arrives on the MAIN flow's 1-4 numbering; the add wizard has no parent
 * step, hence normalizeAddSignupPage.
 */
function safeAddEnrollmentPath(schoolUUID, parentId, sessionUserId, step) {
  const parent = String(parentId || "").trim();
  const sessionUser = String(sessionUserId || "").trim();
  if (!/^\d+$/.test(parent)) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(sessionUser)) return null;
  return addEnrollmentStepPath(schoolUUID, parent, sessionUser, normalizeAddSignupPage(step) ?? 1);
}

// Explicit 303 (See Other) on every redirect below — the request that
// reaches this handler may be a POST (see doc comment above), and only 303
// tells the browser to follow up with a GET regardless of the original
// method. A 307/308 (Next.js's default) would preserve POST, and the
// target page routes don't have POST handlers, so the browser would just
// hit the same 405 one hop later.
function redirectTo(path, request) {
  return NextResponse.redirect(new URL(path, request.url), 303);
}

/**
 * UAT only: which backend instance actually issued this handoff. There is
 * no picker involved when a student lands on Login.jsp directly on one of
 * several UAT backends (see constant/UatBackendUrls.js) — the SSO redirect
 * URL itself carries no indication of which instance built it (every
 * instance points at the same single Next.js deployment). The Referer
 * header on this navigation is the only signal we get: the browser just
 * navigated here FROM that backend's own login page, and under the
 * default/modern "strict-origin-when-cross-origin" referrer policy a
 * same-or-upgraded-scheme cross-origin navigation still sends the
 * referrer's origin (not its full path). Returns "" when absent, not an
 * http(s) URL, or already same-origin as this app (nothing to override).
 */
function detectOriginatingBackend(request) {
  if (!isBackendOverrideAllowed()) return "";
  const referer = request.headers.get("referer") || "";
  try {
    const refererUrl = new URL(referer);
    if (!/^https?:$/.test(refererUrl.protocol)) return "";
    if (refererUrl.origin === new URL(request.url).origin) return "";
    return refererUrl.origin;
  } catch {
    return "";
  }
}

async function handleSsoHandoff(request) {
  const url = new URL(request.url);
  const ssoToken = url.searchParams.get("token");
  const schoolUUID = url.searchParams.get("school");
  const schoolName = url.searchParams.get("schoolName");
  const step = url.searchParams.get("step");
  const targetStep = VALID_STEPS.has(step) ? step : "1";
  const program = getLearningProgramRouteCode(url.searchParams.get("program")) || DEFAULT_PROGRAM;
  const backendOverride = detectOriginatingBackend(request);

  // console.log("request", request)
  // console.log("url======>", url)
  // console.log("ssoToken======>", ssoToken)
  // console.log("schoolUUID======>", schoolUUID)
  // console.log("schoolName======>", schoolName)
  // console.log("step======>", step)
  // console.log("targetStep======>", targetStep)

  if (!ssoToken || !schoolUUID) {
    return redirectTo("/", request);
  }

  try {
    const result = await signIn("sso-token", { ssoToken, schoolName, schoolUUID, backendOverride, redirect: false });
    if (!result || result.error) {
      console.error("SSO token exchange failed:", result?.error);
      return redirectTo("/", request);
    }
  } catch (err) {
    console.error("SSO token exchange threw:", err);
    return redirectTo("/", request);
  }

  const response = redirectTo(stepPath(schoolUUID, program, targetStep), request);
  // The rest of this student's session (every Server Action after this
  // point) must keep hitting the SAME backend that issued the token, not
  // whatever NEXT_PUBLIC_BACKEND_BASE_URL defaults to — persist it the same
  // way the manual picker does (see components/common/BackendSwitcher.jsx).
  if (backendOverride) {
    response.cookies.set(getBackendOverrideCookieName(), backendOverride, {
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "lax",
    });
  }
  return response;
}

export const GET = handleSsoHandoff;
export const POST = handleSsoHandoff;
