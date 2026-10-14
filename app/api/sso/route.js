import { signIn } from "@/auth";
import { addEnrollmentStepPath, normalizeAddSignupPage } from "@/utils/addEnrollmentSteps";
import { DEFAULT_PROGRAM, stepPath } from "@/utils/wizardSteps";
import { NextResponse } from "next/server";

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
 * Expected URL: /api/sso?token=<oneTimeToken>&step=<1|2|3|4>&school=<schoolUUID>
 * `step` is validated against the routes that actually exist and defaults
 * to "1" if missing/invalid — never trust it blindly as a redirect target.
 * `school` is required — see services/authApi.js's exchangeSsoToken doc
 * comment for why this route needs it despite not otherwise being
 * schoolId-scoped.
 *
 * `ae` ("add enrollment") selects WHICH wizard the browser lands in:
 *   ae=Y  -> the add-another-child wizard,
 *            /{school}/add-enrollment/{parentId}/{sessionUserId}/step/...
 *   ae=N, or no `ae` at all
 *         -> the student's own wizard, /{school}/enrollment/{program}/step/...
 *
 * Optional `next` param: a relative in-app path to forward to AFTER the
 * session is established, carrying the add-enrollment path (the parentId and
 * sessionUserId segments can't be derived here — only the dashboard's "Add
 * another child" button knows them). It is validated to be a same-origin
 * relative path under the given school (`/{school}/...`) to avoid
 * open-redirect.
 *
 * `next` is honoured ONLY together with ae=Y — the flag decides the flow and
 * `next` merely supplies the path for it, so a stray `next` can never divert a
 * normal enrollment into the add-enrollment wizard.
 *
 * With ae=Y and no `next` (the backend's own resume/login link, which can't
 * know the path), `parentId` + `sessionUserId` carry the two segments instead
 * and we build the add-enrollment step path here. Neither can be derived from
 * the session: it is established by signIn() below, whose cookie isn't
 * readable within this same request. If either is missing or malformed we fall
 * back to the main wizard step path rather than guessing.
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
  const nextPath = safeNextPath(url.searchParams.get("next"), schoolUUID);
  // Compared case-insensitively and trimmed: the flag is built by string
  // concatenation on the Java side, so don't be strict about "Y" vs "y".
  const addEnrollment = String(url.searchParams.get("ae") || "").trim().toUpperCase() === "Y";
  const addEnrollmentPath = safeAddEnrollmentPath(
    schoolUUID,
    url.searchParams.get("parentId"),
    url.searchParams.get("sessionUserId"),
    targetStep
  );

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
    const result = await signIn("sso-token", { ssoToken, schoolName, schoolUUID, redirect: false });
    if (!result || result.error) {
      console.error("SSO token exchange failed:", result?.error);
      return redirectTo("/", request);
    }
  } catch (err) {
    console.error("SSO token exchange threw:", err);
    return redirectTo("/", request);
  }

  // ae=Y is the add-another-child flow: take the dashboard's own `next` when it
  // sent one, otherwise the path built from parentId/sessionUserId. Anything
  // else — including a `next` that arrives without ae=Y — falls through to the
  // main wizard step the backend asked for.
  if (addEnrollment) {
    if (nextPath) return redirectTo(nextPath, request);
    if (addEnrollmentPath) return redirectTo(addEnrollmentPath, request);
  }

  // The enrollment program isn't part of the SSO handoff (the backend only
  // sends token/step/school), so the URL uses the default program segment;
  // the wizard resolves the real school/program from the session on load.
  return redirectTo(stepPath(schoolUUID, DEFAULT_PROGRAM, targetStep), request);
}

export const GET = handleSsoHandoff;
export const POST = handleSsoHandoff;
