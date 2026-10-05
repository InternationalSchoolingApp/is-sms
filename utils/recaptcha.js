"use client";

/**
 * Google reCAPTCHA v3 (invisible, score-based) loader + token helper for
 * AccountForm's signup submit. Replaces the old 6-digit image CaptchaField.
 *
 * DUMMY KEY: no real site key has been issued yet — swap
 * NEXT_PUBLIC_RECAPTCHA_SITE_KEY in .env.local for the real one from
 * https://www.google.com/recaptcha/admin before this goes anywhere near
 * production; verification against Google still needs to be wired up
 * backend-side too.
 */
const DUMMY_RECAPTCHA_SITE_KEY = "6Ldummy0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
export const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || DUMMY_RECAPTCHA_SITE_KEY;

let scriptPromise = null;

export function loadRecaptchaScript() {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.grecaptcha) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`;
      script.async = true;
      script.onload = resolve;
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error("Failed to load reCAPTCHA script"));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

/** Resolves a fresh v3 token for `action`, loading the script first if needed. */
export async function getRecaptchaToken(action) {
  await loadRecaptchaScript();
  return new Promise((resolve, reject) => {
    window.grecaptcha.ready(() => {
      window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action }).then(resolve).catch(reject);
    });
  });
}
