import { signIn } from "@/auth";
import { getLearningProgramRouteCode } from "@/constant/LearningPrograms";
import { addEnrollmentStepPath, normalizeAddSignupPage } from "@/utils/addEnrollmentSteps";
import { getBackendOverrideCookieName, isBackendOverrideAllowed } from "@/utils/backendOrigin";
import { DEFAULT_PROGRAM, stepPath } from "@/utils/wizardSteps";
import { NextResponse } from "next/server";
import { MODE_EMBED, MODE_SHARE, reEnrollmentBasePath } from "@/utils/reEnrollmentSteps";

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
  // target=re-enrollment: an existing student who has to re-enroll (the backend sets it, see
  // CommonUtil#getFinalEnrollmentUrl) goes to the re-enrollment pages instead of an enrollment wizard step.
  const target = url.searchParams.get("target");
  // mode=embed: the re-enrollment pages are shown inside the dashboard (iframe, no header / footer); anything else is "share".
  // (embed=1 is the older form of the same switch and is still understood.)
  const mode = url.searchParams.get("mode") === MODE_EMBED || url.searchParams.get("embed") === "1" ? MODE_EMBED : MODE_SHARE;
  // resume=1: continue at the step the student is on (set by the backend on login / payment return); without it the
  // re-enrollment starts from its options screen.
  const resume = url.searchParams.get("resume");
  const targetStep = VALID_STEPS.has(step) ? step : "1";
  const program = getLearningProgramRouteCode(url.searchParams.get("program")) || DEFAULT_PROGRAM;
  const backendOverride = detectOriginatingBackend(request);
  // ae=Y means this student was enrolled by someone else (a parent adding a child),
  // so after the session is established the browser must land on the 3-step
  // /{school}/add-enrollment/{parentId}/{sessionUserId}/step/... wizard instead of the
  // student's own 4-step /{school}/enrollment/... one. parentId + sessionUserId ride the URL.
  const isAddEnrollment = url.searchParams.get("ae") === "Y";
  // The caller may pass the full add-enrollment destination as `next` (dashboard "Add child"
  // button) OR just parentId + sessionUserId for us to build it (backend getFinalEnrollmentUrl).
  // Prefer a validated same-origin `next`, else build from the ids.
  let addEnrollmentPath = null;
  if (isAddEnrollment) {
    addEnrollmentPath = safeNextPath(url.searchParams.get("next"), schoolUUID);
    if (addEnrollmentPath == null) {
      addEnrollmentPath = safeAddEnrollmentPath(schoolUUID, url.searchParams.get("parentId"),
        url.searchParams.get("sessionUserId"), step);
    }
  }

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

  // Add-another-child wizard wins when ae=Y and the path could be built; then an
  // existing student's re-enrollment; otherwise the student's own enrollment step path.
  // fresh=1 marks a real "start" of the add-enrollment wizard (dashboard button / enrollment link). Only such an
  // entry may reserve a new child; a reload of the wizard never does (see useAddEnrollmentContext).
  let destination;
  if (addEnrollmentPath != null) {
    destination = `${addEnrollmentPath}${addEnrollmentPath.includes("?") ? "&" : "?"}fresh=1`;
  } else if (target === "re-enrollment") {
    destination = `${reEnrollmentBasePath(schoolUUID, mode)}${resume === "1" ? "?resume=1" : ""}`;
  } else {
    destination = stepPath(schoolUUID, program, targetStep);
  }
  const response = redirectTo(destination, request);
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
