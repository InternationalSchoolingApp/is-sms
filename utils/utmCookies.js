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
  };
}
