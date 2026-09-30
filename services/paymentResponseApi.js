import { hasBackendOrigin, resolveBackendOrigin } from "@/utils/backendOrigin";

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

function backendUrl(schoolUUID, path) {
  const baseUrl = resolveBackendOrigin();
  if (!hasBackendOrigin() || !schoolUUID) {
    throw new Error("A backend origin and a schoolUUID (from the URL) are required");
  }
  return `${baseUrl}/api/v1/${encodeURIComponent(schoolUUID)}/payment/${path}`;
}

async function getJson(url) {
  const response = await fetch(url, { method: "GET", credentials: "include" });
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
 * Turn a set of params (object or URLSearchParams) into a query string,
 * skipping empty/nullish values so we never send `?foo=&bar=`.
 */
function buildQuery(params) {
  const search = new URLSearchParams();
  const entries = params instanceof URLSearchParams ? params.entries() : Object.entries(params || {});
  for (const [key, value] of entries) {
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
export function getPaymentResponseSuccess(schoolUUID, endpointPath, params) {
  return getJson(`${backendUrl(schoolUUID, endpointPath)}${buildQuery(params)}`);
}

/**
 * Failure: /payment/response-failure/{customReference}/{UNIQUEUUID}.
 * customReference and UNIQUEUUID are PATH segments; everything else
 * (paymentGateway, token, gateway signature fields, ...) rides in the query.
 */
export function getPaymentResponseFailure(schoolUUID, customReference, uniqueUuid, params) {
  const path = `response-failure/${encodeURIComponent(customReference)}/${encodeURIComponent(uniqueUuid)}`;
  return getJson(`${backendUrl(schoolUUID, path)}${buildQuery(params)}`);
}
