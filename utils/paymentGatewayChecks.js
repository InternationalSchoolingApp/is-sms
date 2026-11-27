// isDummyStudentMode() in dummyStudentDashboardData.js, same order: ?parentDemoPreview=Y always wins
// (off), then the legacy isDemoUser global — here `demoUser`, the next-auth session flag from the SSO
// exchange (USER.DEMO_USER) — then the ?dummyStudent=Y URL flag.
export function isDummyStudentMode(demoUser = false) {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get("parentDemoPreview") === "Y") return false;
  if (demoUser) return true;
  // The ?dummyStudent=Y URL flag is a testing aid: on a PROD deployment only a real demo account (above) gets dummy mode,
  // so a shared link cannot switch a student's dashboard to sample data (or a payment page's Pay Now to "do nothing").
  if (String(process.env.NEXT_PUBLIC_DEPLOYMENT_MODE || "").trim().toUpperCase() === "PROD") return false;
  return ["Y", "y", "true", "1", "TRUE"].includes(params.get("dummyStudent") || "");
}

// showDummyStripeCheckoutPage(): TODO — port the dummy checkout page. Until then a dummy-mode
// Pay Now does nothing beyond this warning.
export function showDummyStripeCheckoutPage() {
  console.warn("[Pay Now] dummy student mode: dummy checkout page is not implemented yet.");
  return false;
}
