/**
 * Google reCAPTCHA v3, shared by the public sign-up forms. Server side only (it reads RECAPTCHA_SECRET_KEY); the
 * browser half is just grecaptcha.execute(siteKey, { action }) in the form itself.
 *
 *   NEXT_PUBLIC_DEPLOYMENT_MODE  PROD  turns the check on; every other mode (local, DEV, UAT) skips it.
 *   RECAPTCHA_BYPASS=true        a server-only kill switch: no site key reaches the page and no token is required.
 *   RECAPTCHA_SECRET_KEY         the secret the token is verified with.
 *   RECAPTCHA_MIN_SCORE          0-1, default 0.5: a lower score is refused.
 *
 * The action travels with the token and is checked here, so a token minted for one form cannot be replayed on
 * another (the teacher form uses "teacher_signup").
 */

const DEFAULT_MIN_SCORE = 0.5;

/** True when sign-ups must carry a valid reCAPTCHA token (production, and not switched off). */
export function isRecaptchaRequired() {
  const isProdDeployment = String(process.env.NEXT_PUBLIC_DEPLOYMENT_MODE || "").trim().toUpperCase() === "PROD";
  return isProdDeployment && !isRecaptchaBypassed();
}

export function isRecaptchaBypassed() {
  return String(process.env.RECAPTCHA_BYPASS || "").trim().toLowerCase() === "true";
}

/** The site key the page may hand to the browser: undefined when the check is off, so the form skips it too. */
export function getRecaptchaSiteKey() {
  return isRecaptchaRequired() ? process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || undefined : undefined;
}

/** Verifies a token with Google for `action`; false on any failure (missing secret/token, network, low score). */
export async function verifyRecaptcha(token, action) {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret || !token) return false;

  const configuredThreshold = Number(process.env.RECAPTCHA_MIN_SCORE);
  const minimumScore =
    Number.isFinite(configuredThreshold) && configuredThreshold >= 0 && configuredThreshold <= 1
      ? configuredThreshold
      : DEFAULT_MIN_SCORE;

  try {
    const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
      cache: "no-store",
    });
    if (!response.ok) return false;

    const result = await response.json();
    return result.success === true && result.action === action && Number(result.score) >= minimumScore;
  } catch {
    return false;
  }
}
