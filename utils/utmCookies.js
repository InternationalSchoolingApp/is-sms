/**
 * Reimplementation of cookiesLib.js's UTM/marketing-attribution capture —
 * same cookie keys and same "capture once, read many times" behavior, just
 * without a JSP page to load it from. Call captureUtmParamsFromUrl() once on
 * the account-creation page mount; read values anywhere with getCookie().
 */

const UTM_QUERY_TO_COOKIE = {
  us: "us",
  um: "um",
  uc: "uc",
  cu: "cu",
  gclid: "gclid",
  ucam: "ucam",
  ut: "ut",
  lu: "lu",
};

const COOKIE_MAX_AGE_DAYS = 30;

export function getCookie(name) {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : "";
}

function getCookieDomain() {
  const host = window.location.hostname;

  if (!host || host.indexOf(".") === -1 || /^[0-9.]+$/.test(host) || host === "localhost") {
    return "";
  }

  return host.split(".").slice(-2).join(".");
}

function setCookie(name, value) {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + COOKIE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000).toUTCString();
  const domain = getCookieDomain();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}${domain ? `; domain=${domain}` : ""}; path=/`;
}

export function captureUtmParamsFromUrl() {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  Object.entries(UTM_QUERY_TO_COOKIE).forEach(([queryKey, cookieKey]) => {
    const value = params.get(queryKey);
    if (value) setCookie(cookieKey, value);
  });
  if (!getCookie("cu")) {
    setCookie("cu", window.location.href);
  }
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
