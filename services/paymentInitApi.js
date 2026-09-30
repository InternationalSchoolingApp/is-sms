import { hasBackendOrigin, resolveBackendOrigin } from "@/utils/backendOrigin";

const SCHOOL_ID = process.env.NEXT_PUBLIC_SCHOOL_ID;

function buildQuery(params) {
  const query = new URLSearchParams();
  for (const [key, value] of params.entries()) {
    query.append(key, value);
  }
  query.set("applyingFrom", "nextjs");
  return query.toString();
}

async function getPaymentInitResponse(gateway, uniqueUuid, params) {
  const baseUrl = resolveBackendOrigin();
  if (!hasBackendOrigin() || !SCHOOL_ID || !uniqueUuid) return null;

  const query = buildQuery(params);
  const url = `${baseUrl}/api/v1/${encodeURIComponent(SCHOOL_ID)}/payment/${gateway}-payment-init/${encodeURIComponent(uniqueUuid)}${query ? `?${query}` : ""}`;

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

export function getStripePaymentInit(uniqueUuid, params) {
  return getPaymentInitResponse("stripe", uniqueUuid, params);
}

export function getAirwallexPaymentInit(uniqueUuid, params) {
  return getPaymentInitResponse("airwallex", uniqueUuid, params);
}
