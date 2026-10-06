import { readCookie, writeCookie } from "@/utils/cookieDomain";

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

export function initializeCampaignCookies() {
  if (typeof window === "undefined") {
    return;
  }

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
