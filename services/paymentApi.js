import { encodePayload } from "@/utils/payloadEncoding";
import { resolveBackendOrigin } from "@/utils/backendOrigin";

/**
 * Payment-gateway endpoints, confirmed from ClientCommonPaymentController.java.
 */

const SCHOOL_ID = process.env.NEXT_PUBLIC_SCHOOL_ID;

function backendUrl(path) {
  const baseUrl = resolveBackendOrigin();
  if (!baseUrl || !SCHOOL_ID) {
    throw new Error(
      "NEXT_PUBLIC_BACKEND_BASE_URL and NEXT_PUBLIC_SCHOOL_ID must be set (see .env.local.example)"
    );
  }
  return `${baseUrl}/${SCHOOL_ID}/${path}`;
}

async function postPayload(path, data) {
  const response = await fetch(backendUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ payload: encodePayload(data) }),
  });
  return response.json();
}

export function getPaymentGatewayOptions(request) {
  return postPayload("common/payment-gateway/options", request);
}

export function invokePaymentGateway(request) {
  return postPayload("common/invoke-payment-gateway", request);
}

export function checkPayment(request) {
  return postPayload("common/check-payment", request);
}

export function getPaymentPaidStatus(request) {
  return postPayload("common/get-payment-paid-status", request);
}

export function getPaymentGatewayMaster() {
  return fetch(backendUrl("pg-getway-master"), { credentials: "include" }).then((r) => r.json());
}
