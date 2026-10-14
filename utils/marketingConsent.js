import { useSyncExternalStore } from "react";
import { readCookie, resolveCookieDomain, writeRawCookie } from "@/utils/cookieDomain";

// Marketing (Meta) cookie consent. One cookie, shared by every *.internationalschooling.org app:
//   is_marketing_consent = "granted" | "denied"   (absent = the visitor has not chosen yet)
// Nothing Meta-related (Pixel, parameter-builder library, _fbp/_fbc/_fbi cookies) may run until it is "granted".
export const CONSENT_COOKIE = "is_marketing_consent";
export const CONSENT_EVENT = "is:marketing-consent"; // detail: "granted" | "denied"

const MAX_AGE_DAYS = 365;
const META_COOKIES = ["_fbp", "_fbc", "_fbi"];

/** "granted", "denied", or null when the visitor has not chosen. */
export function readConsent() {
  const v = readCookie(CONSENT_COOKIE);
  return v === "granted" || v === "denied" ? v : null;
}

function expire(name, domain) {
  document.cookie = `${name}=; path=/; max-age=0${domain ? "; domain=" + domain : ""}`;
}

/** Removes the Meta cookies, on the resolved shared domain and on this host. */
export function deleteMetaCookies() {
  if (typeof document === "undefined") return;
  for (const name of META_COOKIES) {
    expire(name, "");
    const domain = resolveCookieDomain();
    if (domain) expire(name, domain);
  }
}

/** Stores the choice, tells the rest of the page, and removes the Meta cookies when it is "denied". */
export function writeConsent(value) {
  writeRawCookie(CONSENT_COOKIE, value, MAX_AGE_DAYS);
  if (value === "denied") deleteMetaCookies();
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }));
}

function subscribe(callback) {
  window.addEventListener(CONSENT_EVENT, callback);
  return () => window.removeEventListener(CONSENT_EVENT, callback);
}

/** Current choice in a component: "granted" | "denied" | null (not chosen) | "pending" while server-rendering. */
export function useMarketingConsent() {
  return useSyncExternalStore(subscribe, readConsent, () => "pending");
}
