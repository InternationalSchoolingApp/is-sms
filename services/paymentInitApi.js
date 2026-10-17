"use server";

import { withSmsAuth } from "@/lib/auth/session";

import { hasBackendOrigin, resolveServerBackendOrigin } from "@/utils/backendOrigin";

// School-prefixed gateway pages pass their URL school segment explicitly.
// Older unprefixed pages can still fall back to the query param or env value.
// `paramsString` is a plain string, not a URLSearchParams instance — Server
// Actions can only accept serializable arguments (see
// services/studentSignupApi.js's getEnrollmentSignupInfo for the same pattern).
function buildQuery(paramsString) {
  const params = new URLSearchParams(paramsString || "");
  const query = new URLSearchParams();
  for (const [key, value] of params.entries()) {
    if (key === "schoolUUID") continue;
    query.append(key, value);
  }
  query.set("applyingFrom", "nextjs");
  return query.toString();
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
