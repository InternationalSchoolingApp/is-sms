import { hasBackendOrigin, resolveBackendOrigin } from "@/utils/backendOrigin";

// School-prefixed gateway pages pass their URL school segment explicitly.
// Older unprefixed pages can still fall back to the query param or env value.
function buildQuery(params) {
  const query = new URLSearchParams();
  for (const [key, value] of params.entries()) {
    if (key === "schoolUUID") continue;
    query.append(key, value);
  }
  query.set("applyingFrom", "nextjs");
  return query.toString();
}

async function getPaymentInitResponse(gateway, uniqueUuid, params, schoolUUIDFromRoute) {
  const baseUrl = resolveBackendOrigin();
  const schoolUUID =
    schoolUUIDFromRoute || params?.get("schoolUUID") || process.env.NEXT_PUBLIC_SCHOOL_ID;
  if (!hasBackendOrigin() || !schoolUUID || !uniqueUuid) return null;

  const query = buildQuery(params);
  const url = `${baseUrl}/api/v1/${encodeURIComponent(schoolUUID)}/payment/${gateway}-payment-init/${encodeURIComponent(uniqueUuid)}${query ? `?${query}` : ""}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export function getStripePaymentInit(uniqueUuid, params, schoolUUID) {
  return getPaymentInitResponse("stripe", uniqueUuid, params, schoolUUID);
}

export function getAirwallexPaymentInit(uniqueUuid, params, schoolUUID) {
  return getPaymentInitResponse("airwallex", uniqueUuid, params, schoolUUID);
}
