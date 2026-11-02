// TEMPORARY diagnostic route — delete after confirming Vercel's reachability
// to the UAT backend. Not meant to ship.
import { resolveServerBackendOrigin, hasBackendOrigin } from "@/utils/backendOrigin";

async function probe(label, url) {
  const started = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { signal: controller.signal, redirect: "manual" });
    clearTimeout(timeout);
    return { label, url, reachable: true, status: res.status, elapsedMs: Date.now() - started };
  } catch (err) {
    return { label, url, reachable: false, errorName: err?.name, errorMessage: err?.message, elapsedMs: Date.now() - started };
  }
}

export async function GET() {
  const backend = process.env.NEXT_PUBLIC_BACKEND_BASE_URL || "";
  const resolvedServerOrigin = await resolveServerBackendOrigin().catch((e) => `ERROR: ${e?.message}`);

  const result = {
    env: {
      NEXT_PUBLIC_BACKEND_BASE_URL: backend || null,
      NEXT_PUBLIC_USE_LOCAL_PROXY: process.env.NEXT_PUBLIC_USE_LOCAL_PROXY || null,
      BACKEND_BASE_URL: process.env.BACKEND_BASE_URL ? "(set, server-only)" : null,
      APP_ORIGIN: process.env.APP_ORIGIN || null,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || null,
      VERCEL_URL: process.env.VERCEL_URL || null,
      VERCEL_REGION: process.env.VERCEL_REGION || null,
    },
    hasBackendOrigin: hasBackendOrigin(),
    // This is what postPayload()/getPayload() actually use as the base for every backend call.
    resolvedServerOrigin,
  };

  const probes = [];
  if (backend) probes.push(await probe("direct-backend-root", backend + "/"));
  if (resolvedServerOrigin && typeof resolvedServerOrigin === "string") {
    // Mirrors backendUrl(schoolUUID, "api/v1/common-script-variables") using a dummy schoolUUID,
    // just to see whether the self-rewrite path round-trips to the backend at all.
    probes.push(await probe("resolved-origin-self-rewrite", `${resolvedServerOrigin}/__debug-school__/api/v1/common-script-variables`));
  }

  return Response.json({ ...result, probes });
}
