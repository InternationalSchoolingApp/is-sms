/**
 * Read side of cookiesLib.js's UTM/marketing-attribution capture — same
 * cookie keys as the legacy app, just without a JSP page to load them from.
 *
 * Capture happens once per page load in initializeCampaignCookies()
 * (utils/campaignCookies.js, mounted from the root layout via
 * CampaignCookieInitializer); this module only reads those cookies back into
 * the shape the signup endpoints expect.
 */

import { readCookie } from "@/utils/cookieDomain";

export function getCookie(name) {
  return readCookie(name);
}

/**
 * Browser JSON stored with the lead (BROWSER_DETAILS): user agent plus the Meta fbp / fbc cookies,
 * same shape the website forms send. Read raw: _fbc is case sensitive and must not be altered.
 */
export function getBrowserDetailsForSignup() {
  if (typeof document === "undefined") return "{}";
  const raw = (key) => {
    const m = document.cookie.match("(?:^|; )" + key + "=([^;]*)");
    return m ? m[1] : "";
  };
  return JSON.stringify({
    uAgentFull: navigator.userAgent,
    fbp: raw("_fbp"),
    fbc: raw("_fbc"),
    fbi: raw("_fbi"),
    // page the signup was submitted on and the page the visitor came from: sent to Meta (cleaned) as event_source_url / referrer_url
    pageUrl: window.location.href,
    referrer: document.referrer || "",
    // consent choice travels with the lead: the server only sends Meta events for "granted"
    metaConsent: ["granted", "denied"].includes(raw("is_marketing_consent")) ? raw("is_marketing_consent") : "unset",
  });
}

/** Builds the utm* fields expected in the enrollment/stage-1 request body. */
export function getUtmFieldsForSignup() {
  return {
    utmSource: getCookie("us"),
    utmMedium: getCookie("um"),
    utmDescription: getCookie("uc"),
    originalUrl: getCookie("cu"),
    gclid: getCookie("gclid"),
    utmCampaign: getCookie("ucam"),
    utmTerm: getCookie("ut"),
    landingPage: getCookie("lu"),
    browserDetails: getBrowserDetailsForSignup(),
  };
}
