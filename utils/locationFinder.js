import { resolveBackendOrigin } from "@/utils/backendOrigin";
import { getCommonScriptVariables } from "@/services/studentSignupApi";

/**
 * Port of the payer-location functions in the Java frontend —
 * theme2/js/custom/locationFinder.js (callLocationForPaymentFill,
 * callLocationForPaymentPromise, getCountryISOCode) and commonPaymentGateway.js
 * (getPayerCountryCodePromise) — with the same names, order and behavior.
 *
 * The Java pages get three globals from CommonCustomScript.jsp:
 *   LOCATION_SERVICE_BYPASS  'true' -> never call the IP service, use DEFAULT_LOCATION
 *   DEFAULT_LOCATION         JSON string of a location object ({"countryCode":"IN", ...})
 *   PRO_IP_API_URL           '/api/v1/ip-location'
 * loadLocationGlobals() fills them from POST {school}/api/v1/common-script-variables
 * (what getCommonCustomScript() calls). The `#location` hidden input the legacy code
 * keeps the resolved location in is the module-level `location` string here.
 */
const PRO_IP_API_URL = "/api/v1/ip-location";

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

// GET PRO_IP_API_URL — the $.ajax({ global:false, type:"GET", url: PRO_IP_API_URL }) call.
async function fetchIpLocation() {
  const response = await fetch(`${resolveBackendOrigin()}${PRO_IP_API_URL}`, { credentials: "include" });
  if (!response.ok) throw new Error(`ip-location responded ${response.status}`);
  return response.json();
}

// callLocationForPaymentFill(data): only a non-empty value is stored, as JSON.
export async function callLocationForPaymentFill(data) {
  if (data != undefined && data != "") {
    location = JSON.stringify(data);
  }
}

// callLocationForPaymentPromise()
export async function callLocationForPaymentPromise() {
  if (LOCATION_SERVICE_BYPASS == "true") {
    await callLocationForPaymentFill(JSON.parse(DEFAULT_LOCATION));
  } else {
    try {
      const data = await fetchIpLocation();
      await callLocationForPaymentFill(data);
    } catch (e) {
      console.error(e);
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
    return "";
  }
}

// getAirwallexMethods()'s country: the captured #location's country, else the browser locale.
export function getAirwallexCountryCode() {
  return location == "" ? getCountryISOCode() : JSON.parse(location).countryCode;
}
