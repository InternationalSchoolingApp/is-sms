const ALREADY_PAID_MESSAGE = "This fee is already paid. You don't need to pay again.";

/**
 * Translate invoke-payment-gateway's duplicate-payment responses into either a same-browser checkout
 * redirect or the recovery prompt used by the enrollment payment screen.
 */
export function getPaymentAttemptRecovery(response, gatewayName, openedAt = Date.now()) {
  if (response?.statusCode === "PAYMENT_IN_PROGRESS") {
    const attempt = response.details;
    if (!attempt?.attemptRef) {
      return {
        resumeUrl: null,
        request: {
          attempt: null,
          autoCancel: false,
          alreadyPaidMessage: "",
          unavailableMessage: response.message || "Another payment is already in progress. Please wait a moment and try again.",
          openedAt,
        },
      };
    }

    const sameGateway = String(attempt.gateway || "").toLowerCase() === String(gatewayName || "").toLowerCase();
    const resumeUrl = attempt.sameBrowser && attempt.sameFee !== false && attempt.canContinue && sameGateway
      && typeof attempt.continueUrl === "string" && /^https?:\/\//i.test(attempt.continueUrl)
      ? attempt.continueUrl
      : null;
    return {
      resumeUrl,
      request: {
        attempt,
        autoCancel: Boolean(attempt.sameBrowser),
        alreadyPaidMessage: "",
        unavailableMessage: "",
        openedAt,
      },
    };
  }

  if (response?.statusCode === "ALREADY_PAID") {
    return {
      resumeUrl: null,
      request: {
        attempt: null,
        autoCancel: false,
        alreadyPaidMessage: response.message || ALREADY_PAID_MESSAGE,
        unavailableMessage: "",
        openedAt,
      },
    };
  }

  return null;
}
