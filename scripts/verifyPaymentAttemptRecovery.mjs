import assert from "node:assert/strict";
import { getPaymentAttemptRecovery } from "../utils/paymentAttemptRecovery.mjs";

const attempt = {
  attemptRef: "attempt-ref",
  gateway: "Stripe",
  sameFee: true,
  sameBrowser: true,
  canContinue: true,
  continueUrl: "https://checkout.stripe.com/c/pay/session",
};

assert.deepEqual(
  getPaymentAttemptRecovery(
    { statusCode: "PAYMENT_IN_PROGRESS", details: attempt },
    "Stripe",
    123
  ),
  {
    resumeUrl: attempt.continueUrl,
    request: {
      attempt,
      autoCancel: true,
      alreadyPaidMessage: "",
      unavailableMessage: "",
      openedAt: 123,
    },
  },
  "same-browser Stripe payments resume their existing checkout"
);

const otherBrowser = getPaymentAttemptRecovery(
  { statusCode: "PAYMENT_IN_PROGRESS", details: { ...attempt, sameBrowser: false } },
  "Stripe",
  456
);
assert.equal(otherBrowser.resumeUrl, null);
assert.equal(otherBrowser.request.autoCancel, false);
assert.equal(otherBrowser.request.attempt.attemptRef, attempt.attemptRef);

const unavailable = getPaymentAttemptRecovery(
  { statusCode: "PAYMENT_IN_PROGRESS", message: "A payment is already in progress." },
  "Stripe",
  654
);
assert.equal(unavailable.resumeUrl, null);
assert.equal(unavailable.request.attempt, null);
assert.equal(unavailable.request.unavailableMessage, "A payment is already in progress.");

const alreadyPaid = getPaymentAttemptRecovery({ statusCode: "ALREADY_PAID" }, "Stripe", 789);
assert.equal(alreadyPaid.request.alreadyPaidMessage, "This fee is already paid. You don't need to pay again.");
assert.equal(alreadyPaid.request.attempt, null);
assert.equal(getPaymentAttemptRecovery({ statusCode: "FAILED" }, "Stripe"), null);

console.log("payment attempt recovery: all checks passed");
