import { getCommonScriptVariables } from "@/services/studentSignupBackendApi";
import { getIpLocation } from "@/services/ipLocationClientApi";

/**
 * Port of the payer-location functions in the Java frontend —
 * theme2/js/custom/locationFinder.js (callLocationForPaymentFill,
 * callLocationForPaymentPromise, getCountryISOCode) and commonPaymentGateway.js
 * (getPayerCountryCodePromise) — with the same names, order and behavior.
 *
 * The Java pages get three globals from CommonCustomScript.jsp:
 *   LOCATION_SERVICE_BYPASS  'true' -> never call the IP service, use DEFAULT_LOCATION
 *   DEFAULT_LOCATION         JSON string of a location object ({"countryCode":"IN", ...})
 *   PRO_IP_API_URL           the pro.ip-api.com URL called directly from the browser
 * loadLocationGlobals() fills them from POST {school}/api/v1/common-script-variables
 * (what getCommonCustomScript() calls). The `#location` hidden input the legacy code
 * keeps the resolved location in is the module-level `location` string here.
 */ 
let LOCATION_SERVICE_BYPASS;
let DEFAULT_LOCATION;
let loaded = false;
let location = ""; // the `#location` input's value

export async function loadLocationGlobals({ schoolUUID, userId }) {
  if (loaded) return;
  const response = await getCommonScriptVariables(schoolUUID, { userId });
  if (!response) throw new Error("common-script-variables returned no response");
  LOCATION_SERVICE_BYPASS = String(response.LOCATION_SERVICE_BYPASS);
  DEFAULT_LOCATION = response.DEFAULT_LOCATION;
  loaded = true;
}

// $("#location").val()
export function getLocationValue() {
  return location;
}

// getCountryISOCode(): the browser locale's region, lower-cased.
export function getCountryISOCode() {
  const region = (typeof navigator !== "undefined" ? navigator.language || "" : "").split("-")[1];
  return region ? region.toLowerCase() : "";
}

// GET PRO_IP_API_URL — the $.ajax({ global:false, type:"GET", url: PRO_IP_API_URL }) call,
// made directly from the browser against pro.ip-api.com.
async function fetchIpLocation() {
  const data = await getIpLocation();
  if (!data) throw new Error("ip-location returned no data");
  return data;
}

const IP_LOCATION_TIMEOUT_MS = 10_000;

// Network tab "(failed)" -> TypeError, "(canceled)" -> AbortError.
function isFailedOrCancelled(e) {
  return e?.name === "TypeError" || e?.name === "AbortError";
}

// callLocationForPaymentFill(data): only a non-empty value is stored, as JSON.
export async function callLocationForPaymentFill(data) {
  if (data != undefined && data != "") {
    location = JSON.stringify(data);
  }
}

// callLocationForPaymentPromise()
export async function callLocationForPaymentPromise({ throwOnError = false } = {}) {
  if (LOCATION_SERVICE_BYPASS == "true") {
    await callLocationForPaymentFill(JSON.parse(DEFAULT_LOCATION));
  } else {
    const request = fetchIpLocation();
    try {
      // Wait at most IP_LOCATION_TIMEOUT_MS for ip-api when there is a DEFAULT_LOCATION to use meanwhile.
      const data = DEFAULT_LOCATION
        ? await Promise.race([
            request,
            new Promise((resolve) => setTimeout(() => resolve(null), IP_LOCATION_TIMEOUT_MS)),
          ])
        : await request;
      if (data) {
        await callLocationForPaymentFill(data);
      } else {
        // Too slow: use DEFAULT_LOCATION now, and swap in the actual location if the request still succeeds.
        await callLocationForPaymentFill(JSON.parse(DEFAULT_LOCATION));
        request.then(callLocationForPaymentFill).catch(() => {});
      }
    } catch (e) {
      if (isFailedOrCancelled(e) && DEFAULT_LOCATION) {
        await callLocationForPaymentFill(JSON.parse(DEFAULT_LOCATION));
        return;
      }
      console.error(e);
      if (throwOnError) throw e;
    }
  }
}

// getPayerCountryCodePromise(): the payer's ISO country from ip-api (or a page-captured
// #location value / bypass default). Returns '' if it cannot be determined.
export async function getPayerCountryCodePromise() {
  try {
    if (LOCATION_SERVICE_BYPASS == "true") {
      return JSON.parse(DEFAULT_LOCATION).countryCode || "";
    }
    if (location) {
      try {
        return JSON.parse(location).countryCode || "";
      } catch (e) {}
    }
    const data = await fetchIpLocation();
    return data && data.countryCode ? data.countryCode : "";
  } catch (e) {
    if (isFailedOrCancelled(e) && DEFAULT_LOCATION) return JSON.parse(DEFAULT_LOCATION).countryCode || "";
    return "";
  }
}

// DEFAULT_LOCATION's country (lower-cased), or '' when it isn't loaded / not valid.
export function getDefaultCountryCode() {
  try {
    return (JSON.parse(DEFAULT_LOCATION).countryCode || "").toLowerCase();
  } catch {
    return "";
  }
}

// getAirwallexMethods()'s country: the captured #location's country, else the browser locale.
export function getAirwallexCountryCode() {
  return location == "" ? getCountryISOCode() : JSON.parse(location).countryCode;
}
