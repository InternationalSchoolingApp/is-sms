// isDummyStudentMode() in dummyStudentDashboardData.js. The `isDemoUser` JSP global has no Next.js
// equivalent yet, so only the ?dummyStudent=Y URL flag is honoured.
export function isDummyStudentMode() {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get("parentDemoPreview") === "Y") return false;
  return ["Y", "y", "true", "1"].includes(params.get("dummyStudent") || "");
}

// showDummyStripeCheckoutPage(): TODO — port the dummy checkout page. Until then a dummy-mode
// Pay Now does nothing beyond this warning.
export function showDummyStripeCheckoutPage() {
  console.warn("[Pay Now] dummy student mode: dummy checkout page is not implemented yet.");
  return false;
}
