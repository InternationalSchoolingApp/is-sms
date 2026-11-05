import { NextResponse } from "next/server";
import { exchangeSsoToken } from "@/services/authApi";
import { MAX_ACCOUNTS, clearAccount, heldAccounts, isAccountId, writeAccount, writePick } from "@/lib/auth/accountCookies";
import { defaultBackend, logoutAtSms, trustedBackend } from "@/lib/auth/smsTokens";
import { DEFAULT_PROGRAM, stepPath } from "@/utils/wizardSteps";
import { getLearningProgramRouteCode } from "@/constant/LearningPrograms";
import { addEnrollmentStepPath, normalizeAddSignupPage } from "@/utils/addEnrollmentSteps";
import { detectOriginatingBackend, getBackendOverrideCookieName, isBackendOverrideAllowed, parseBackendOrigin } from "@/utils/backendOrigin";

const VALID_STEPS = new Set(["1", "2", "3", "4"]);

/**
 * SSO handoff endpoint — the redirect target the legacy Java login page
 * (Login.jsp) sends a STUDENT with an in-progress enrollment to, instead of
 * its own JSP continuation page. Login itself still happens entirely on the
 * Java side; this only exchanges the one-time `token` it hands us for a
 * signed-in account in this browser (services/authApi.js's exchangeSsoToken
 * returns SMS's access and refresh tokens, written as this user's account cookies, see lib/auth/accountCookies.js), then forwards the browser on
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

async function handleSsoHandoff(request) {
  const url = new URL(request.url);
  const ssoToken = url.searchParams.get("token");
  const schoolUUID = url.searchParams.get("school");
  const schoolName = url.searchParams.get("schoolName");
  const step = url.searchParams.get("step");
  const targetStep = VALID_STEPS.has(step) ? step : "1";
  const program = getLearningProgramRouteCode(url.searchParams.get("program")) || DEFAULT_PROGRAM;
  // getFinalEnrollmentUrl now appends this explicitly (same as ClientSignupStudentController's
  // anonymous-signup redirect handled in proxy.js) — prefer it over the Referer-based guess, which
  // is absent for a typed/bookmarked login page.
  const backendParam = isBackendOverrideAllowed() ? parseBackendOrigin(url.searchParams.get("backend")) : "";
  const backendOverride = backendParam || detectOriginatingBackend(request);
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

  // The one-time token buys this user's SMS access and refresh tokens (SMS: auth.sso.issue-tokens=true).
  let exchanged;
  try {
    exchanged = await exchangeSsoToken(schoolUUID, ssoToken, backendOverride);
  } catch (err) {
    console.error("SSO token exchange threw:", err);
    return redirectTo("/", request);
  }
  if (!exchanged || exchanged.status === "0" || !isAccountId(exchanged.uniqueId)) {
    console.error("SSO token exchange failed:", exchanged?.message);
    return redirectTo("/", request);
  }
  if (!exchanged.accessToken || !exchanged.refreshToken) {
    console.error("SSO token exchange returned no tokens: set auth.token.enabled and auth.sso.issue-tokens on SMS");
    return redirectTo("/", request);
  }

  // Add-another-child wizard wins when ae=Y and the path could be built; otherwise the student's own enrollment step.
  // fresh=1 marks a real "start" of the add-enrollment wizard (dashboard button / enrollment link). Only such an
  // entry may reserve a new child; a reload of the wizard never does (see useAddEnrollmentContext).
  const target = addEnrollmentPath != null
    ? `${addEnrollmentPath}${addEnrollmentPath.includes("?") ? "&" : "?"}fresh=1`
    : stepPath(schoolUUID, program, targetStep);
  const response = redirectTo(target, request);
  const account = exchanged.uniqueId;
  // The step page right after this redirect is for the user who just signed in, even when the browser holds
  // other signed-in users: no "Choose account" page (proxy.js reads this one-time pick).
  writePick(response.cookies, account, target);
  const backend = backendOverride || defaultBackend();
  // At most MAX_ACCOUNTS users per browser: signing in one more ends the oldest login here.
  const others = heldAccounts(request.cookies).filter((a) => a.account !== account);
  others.sort((a, b) => (a.profile?.signedInAt || 0) - (b.profile?.signedInAt || 0));
  while (others.length >= MAX_ACCOUNTS) {
    const oldest = others.shift();
    await logoutAtSms(trustedBackend(oldest.profile?.backend), oldest.profile?.schoolUUID, oldest.refreshToken);
    clearAccount(response.cookies, oldest.account);
  }
  writeAccount(response.cookies, account, {
    accessToken: exchanged.accessToken,
    refreshToken: exchanged.refreshToken,
    profile: {
      userId: exchanged.userId,
      email: exchanged.email || "",
      schoolUUID: exchanged.schoolUUID || schoolUUID,
      schoolName: schoolName || exchanged.schoolName || "",
      backend,
      signedInAt: Date.now(),
    },
  });
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
