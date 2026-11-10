"use server";

import { withSmsAuth } from "@/lib/auth/session";

import { hasBackendOrigin, resolveServerBackendOrigin } from "@/utils/backendOrigin";

// School-prefixed gateway pages pass their URL school segment explicitly.
// Older unprefixed pages can still fall back to the query param or env value.
// `paramsString` is a plain string, not a URLSearchParams instance — Server
// Actions can only accept serializable arguments (see
// services/studentSignupApi.js's getEnrollmentSignupInfo for the same pattern).
// Every gateway param (attemptToken, applyingFrom, ...) is forwarded unchanged; applyingFrom is
// only added when the link has none.
function buildQuery(paramsString) {
  const params = new URLSearchParams(paramsString || "");
  const query = new URLSearchParams();
  for (const [key, value] of params.entries()) {
    if (key === "schoolUUID") continue;
    query.append(key, value);
  }
  if (!query.has("applyingFrom")) query.set("applyingFrom", "nextjs");
  return query.toString();
}

// A non-2xx reply still counts when it is the backend's own { status, message } body (for example
// "This payment link has expired..."), so the page can show that message. Anything else is null.
async function parseInitResponse(response) {
  const text = await response.text();
  if (!text) return null;
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    return null;
  }
  if (response.ok) return body;
  return typeof body?.message === "string" && typeof body?.status !== "number" ? body : null;
}

async function getPaymentInitResponse(gateway, uniqueUuid, paramsString, schoolUUIDFromRoute) {
  const baseUrl = await resolveServerBackendOrigin();
  const schoolUUID =
    schoolUUIDFromRoute || new URLSearchParams(paramsString || "").get("schoolUUID") || process.env.NEXT_PUBLIC_SCHOOL_ID;
  if (!hasBackendOrigin() || !schoolUUID || !uniqueUuid) return null;

  const query = buildQuery(paramsString);
  const url = `${baseUrl}/api/v1/${encodeURIComponent(schoolUUID)}/payment/${gateway}-payment-init/${encodeURIComponent(uniqueUuid)}${query ? `?${query}` : ""}`;

  try {
    const response = await fetch(url, await withSmsAuth({ method: "GET" }));
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export async function getStripePaymentInit(uniqueUuid, paramsString, schoolUUID) {
  return getPaymentInitResponse("stripe", uniqueUuid, paramsString, schoolUUID);
}

export async function getAirwallexPaymentInit(uniqueUuid, paramsString, schoolUUID) {
  return getPaymentInitResponse("airwallex", uniqueUuid, paramsString, schoolUUID);
}

/**
 * Stripe Embedded Checkout init (is-rest-api PaymentResponseApiController#stripeEmbeddedInit): same parameters as the hosted
 * stripe-payment-init, answers {status: "SUCCESS", clientSecret, publishableKey} for the embedded payment page.
 * Same Server Action shape as the functions above: `paramsString` is the page's query string.
 */
export async function getStripeEmbeddedInit(uniqueUuid, paramsString, schoolUUID) {
  const baseUrl = await resolveServerBackendOrigin();
  if (!hasBackendOrigin() || !schoolUUID || !uniqueUuid) return null;
  const query = buildQuery(paramsString);
  const url = `${baseUrl}/api/v1/${encodeURIComponent(schoolUUID)}/payment/stripe-embedded-init/${encodeURIComponent(uniqueUuid)}${query ? `?${query}` : ""}`;
  try {
    const response = await fetch(url, await withSmsAuth({ method: "GET" }));
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}
