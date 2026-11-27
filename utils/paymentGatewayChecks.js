// isDummyStudentMode() in dummyStudentDashboardData.js, same order: ?parentDemoPreview=Y always wins
// (off), then the legacy isDemoUser global — here `demoUser`, the next-auth session flag from the SSO
// exchange (USER.DEMO_USER) — then the ?dummyStudent=Y URL flag.
export function isDummyStudentMode(demoUser = false) {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get("parentDemoPreview") === "Y") return false;
  if (demoUser) return true;
  return ["Y", "y", "true", "1", "TRUE"].includes(params.get("dummyStudent") || "");
}

// showDummyStripeCheckoutPage(): TODO — port the dummy checkout page. Until then a dummy-mode
// Pay Now does nothing beyond this warning.
export function showDummyStripeCheckoutPage() {
  console.warn("[Pay Now] dummy student mode: dummy checkout page is not implemented yet.");
  return false;
}
