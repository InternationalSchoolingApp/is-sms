import { readCookie, writeCookie, writeRawCookie } from "@/utils/cookieDomain";
import { readConsent } from "@/utils/marketingConsent";

function getUrlParam(name) {
  if (name === undefined || name === "") {
    return false;
  }

  var results = new RegExp("[?&]" + name + "=([^&#]*)").exec(
    window.location.href
  );

  if (results === null) {
    return null;
  }

  return decodeURIComponent(results[1]) || null;
}

function setCookie(key, value) {
  if (value === undefined || value === "") {
    return false;
  }

  // Domain/expiry/SameSite all live in utils/cookieDomain.js — this used to
  // compute the domain as "last two labels of the hostname", which the
  // browser rejects on any host whose last two labels are a public suffix
  // (UAT's is-sms.vercel.app -> vercel.app), so nothing was stored there.
  writeCookie(key, value);
}

function getCookie(key) {
  if (key === undefined || key === "") {
    return false;
  }

  // "Test" is the legacy sentinel for "not set" — the backend's
  // isAttributionValue() (SignupStudentUtil.java) already treats it, "N/A",
  // "0" and "undefined" as absent, so it's kept as-is.
  return readCookie(key) || "Test";
}

function isCookieEmpty(value) {
  return (
    !value ||
    value === "0" ||
    value === "N/A" ||
    value === "undefined" ||
    value === "Test"
  );
}

// Meta Conversions API match keys, in Meta's own format
// (fb.<subdomain_index>.<creation_time_ms>.<value>). Captured on the first page load so the
// signup can send them to the backend. A value the Meta Pixel already set is never overwritten,
// and _fbc is case sensitive, so the fbclid is used exactly as it came in the URL.
const META_COOKIE_DAYS = 90;

function readRawCookie(key) {
  var match = document.cookie.match("(?:^|; )" + key + "=([^;]*)");
  return match ? match[1] : "";
}

// Opt-in: nothing Meta-related is created before the visitor accepts (is_marketing_consent=granted).
export function captureMetaCookies() {
  if (readConsent() !== "granted") return;
  var subdomainIndex = window.location.hostname.indexOf(".") === -1 ? 0 : 1;

  if (!readRawCookie("_fbp")) {
    var rand = Math.floor(1000000000 + Math.random() * 9000000000);
    writeRawCookie("_fbp", "fb." + subdomainIndex + "." + Date.now() + "." + rand, META_COOKIE_DAYS);
  }

  var m = /[?&]fbclid=([^&#]+)/.exec(window.location.search);
  if (m) {
    var current = readRawCookie("_fbc");
    // Meta's client library appends an appendix to the stored value ("<fbclid>.<appendix>")
    var stored = current ? current.split(".").slice(3).join(".") : "";
    if (!current || (stored !== m[1] && stored.indexOf(m[1] + ".") !== 0)) {
      writeRawCookie("_fbc", "fb." + subdomainIndex + "." + Date.now() + "." + m[1], META_COOKIE_DAYS);
    }
  }
}

export function initializeCampaignCookies() {
  if (typeof window === "undefined") {
    return;
  }

  captureMetaCookies();

  var us = getCookie("us");
  var utmSource = getUrlParam("utm_source");

  if (utmSource && (isCookieEmpty(us) || utmSource !== us)) {
    setCookie("us", utmSource);
  }

  var um = getCookie("um");
  var utmMedium = getUrlParam("utm_medium");

  if (utmMedium && (isCookieEmpty(um) || utmMedium !== um)) {
    setCookie("um", utmMedium);
  }

  var uc = getCookie("uc");
  var utmContent = getUrlParam("utm_content");

  if (utmContent && (isCookieEmpty(uc) || utmContent !== uc)) {
    setCookie("uc", utmContent);
  }

  var gc = getCookie("gclid");
  var gclid = getUrlParam("gclid");
  var fbclid = getUrlParam("fbclid");

  if (gclid && (isCookieEmpty(gc) || gclid !== gc)) {
    setCookie("gclid", gclid);
  }

  if (fbclid && (isCookieEmpty(gc) || fbclid !== gc)) {
    setCookie("gclid", fbclid);
  }

  var ucamCheck = getCookie("ucam");
  var utmCampaign = getUrlParam("utm_campaign");

  if (utmCampaign && (isCookieEmpty(ucamCheck) || utmCampaign !== ucamCheck)) {
    setCookie("ucam", utmCampaign);
  }

  var ut = getCookie("ut");
  var utmTerm = getUrlParam("utm_term");

  if (utmTerm && (isCookieEmpty(ut) || utmTerm !== ut)) {
    setCookie("ut", utmTerm);
  }

  // First landing page
  if (isCookieEmpty(getCookie("lu"))) {
    setCookie("lu", window.location.href);
  }

  // First URL containing campaign parameters
  if (
    isCookieEmpty(getCookie("cu")) &&
    (
      getUrlParam("utm_source") ||
      getUrlParam("utm_medium") ||
      getUrlParam("utm_campaign") ||
      getUrlParam("utm_content") ||
      getUrlParam("utm_term") ||
      getUrlParam("gclid") ||
      getUrlParam("fbclid")
    )
  ) {
    setCookie("cu", window.location.href);
  }
}

export function getCampaignCookie(key) {
  return getCookie(key);
}
