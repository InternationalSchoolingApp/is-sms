"use server";

import { withSmsAuth } from "@/lib/auth/session";

import { hasBackendOrigin, resolveServerBackendOrigin } from "@/utils/backendOrigin";

/**
 * JSON payment-response endpoints from PaymentResponseApiController.java.
 * Their shared base is /api/v1/{schoolId}/payment.
 *
 * The response is the flattened set of model attributes the JSP reads —
 * `status` (SUCCESS/ERROR at the transport level), `responseStatus`
 * (1 = success, 2 = under verification, anything else = failed — this is the
 * JSP's `status` EL var), plus `contentFor`, `enrollmentType`,
 * `moduleNameToDisplay`, `userName`, `payAmount`, `grade`, `learningProgram`,
 * `returnUrl`, `showReloadOption`, `initiatedVia`, `htmlMessage`, `redirectTo`,
 * `schoolSettingsLinks`, etc. See PaymentResponseView.jsx for how each is used.
 *
 * EVERY query param the gateway appended to the return URL must be forwarded
 * as-is (the controller inspects them to decide which gateway's
 * paymentResponseX() to run: pgReferneceForStripe, id +
 * pgReferneceForAirwallex, resourcePath + pgReferneceForAFS, pgReferneceForYoco
 * + yocoToken, pgRefernece, UNIQUEUUID, paymentGateway, ...). Callers pass the
 * page's raw searchParams straight through, so nothing is dropped.
 */

async function backendUrl(schoolUUID, path) {
  const baseUrl = await resolveServerBackendOrigin();
  if (!hasBackendOrigin() || !schoolUUID) {
    throw new Error("A backend origin and a schoolUUID (from the URL) are required");
  }
  return `${baseUrl}/api/v1/${encodeURIComponent(schoolUUID)}/payment/${path}`;
}

async function getJson(url) {
  const response = await fetch(url, await withSmsAuth({ method: "GET" }));
  if (!response.ok) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Turn the page's raw query string into a forwardable one, skipping
 * empty/nullish values so we never send `?foo=&bar=`. `paramsString` is a
 * plain string, not a URLSearchParams instance — Server Actions can only
 * accept serializable arguments (see services/studentSignupApi.js's
 * getEnrollmentSignupInfo for the same pattern).
 */
function buildQuery(paramsString) {
  const params = new URLSearchParams(paramsString || "");
  const search = new URLSearchParams();
  for (const [key, value] of params.entries()) {
    if (value !== undefined && value !== null && String(value) !== "") {
      search.append(key, value);
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

/**
 * All four frontend success variants use the API's response-success route.
 */
export async function getPaymentResponseSuccess(schoolUUID, endpointPath, paramsString) {
  return getJson(`${await backendUrl(schoolUUID, endpointPath)}${buildQuery(paramsString)}`);
}

/**
 * Failure: /payment/response-failure/{customReference}/{UNIQUEUUID}.
 * customReference and UNIQUEUUID are PATH segments; everything else
 * (paymentGateway, token, gateway signature fields, ...) rides in the query.
 */
export async function getPaymentResponseFailure(schoolUUID, customReference, uniqueUuid, paramsString) {
  const path = `response-failure/${encodeURIComponent(customReference)}/${encodeURIComponent(uniqueUuid)}`;
  return getJson(`${await backendUrl(schoolUUID, path)}${buildQuery(paramsString)}`);
}

/**
 * Sends browser details (fbc, fbp, IP, user agent, page URL) captured on the
 * payment success page so the Meta Conversions API cron can attach fresh match
 * data to the Purchase event.
 */
export async function savePurchaseBrowserDetails(schoolUUID, userPaymentDetailsId, browserDetails) {
  if (!userPaymentDetailsId || !browserDetails) return null;
  const baseUrl = await resolveServerBackendOrigin();
  if (!hasBackendOrigin() || !schoolUUID) return null;
  const url = `${baseUrl}/api/v1/${encodeURIComponent(schoolUUID)}/payment/${userPaymentDetailsId}/purchase-browser-details`;
  try {
    const response = await fetch(url, await withSmsAuth({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ browserDetails }),
    }));
    return response.ok ? "OK" : null;
  } catch {
    return null;
  }
}
