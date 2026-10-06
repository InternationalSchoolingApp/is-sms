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

function getCookieDomain() {
  var host = window.location.hostname;

  // localhost and IP address
  if (
    !host ||
    host.indexOf(".") === -1 ||
    /^[0-9.]+$/.test(host) ||
    host === "localhost"
  ) {
    return "";
  }

  var parts = host.split(".");

  return parts.slice(-2).join(".");
}

function setCookie(key, value) {
  if (value === undefined || value === "") {
    return false;
  }

  var expires = new Date();

  expires.setTime(
    expires.getTime() + 31 * 24 * 60 * 60 * 1000
  );

  var cookie =
    key +
    "=" +
    encodeURIComponent(value) +
    ";expires=" +
    expires.toUTCString() +
    (getCookieDomain()
      ? ";domain=" + getCookieDomain()
      : "") +
    ";path=/";

  document.cookie = cookie;
}

function getCookie(key) {
  if (key === undefined || key === "") {
    return false;
  }

  var keyValue = document.cookie.match(
    "(^|;) ?" + key + "=([^;]*)(;|$)"
  );

  return keyValue ? decodeURIComponent(keyValue[2]) : "Test";
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