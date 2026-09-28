import { NextResponse } from "next/server";
import { signIn } from "@/auth";

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
 * Handles BOTH GET and POST: Login.jsp's goAhead() (login.js) doesn't
 * navigate the browser via a plain link/redirect — it builds a real
 * `<form method="POST">` (carrying a `hash` field we don't need, since
 * token/step already ride the query string) and submits it, so this is hit
 * as a POST in practice. Both handlers share the same logic.
 */
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
  const step = url.searchParams.get("step");
  const targetStep = VALID_STEPS.has(step) ? step : "1";

  if (!ssoToken || !schoolUUID) {
    return redirectTo("/", request);
  }

  try {
    const result = await signIn("sso-token", { ssoToken, schoolUUID, redirect: false });
    if (!result || result.error) {
      console.error("SSO token exchange failed:", result?.error);
      console.log("redirect url", request)
      return redirectTo("/", request);
    }
  } catch (err) {
    console.error("SSO token exchange threw:", err);
    return redirectTo("/", request);
  }

  return redirectTo(`/step/${targetStep}`, request);
}

export const GET = handleSsoHandoff;
export const POST = handleSsoHandoff;
