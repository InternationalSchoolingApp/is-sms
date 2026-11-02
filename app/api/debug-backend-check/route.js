// TEMPORARY diagnostic route — delete after confirming Vercel's reachability
// to the UAT backend. Not meant to ship.
export async function GET() {
  const backend = process.env.NEXT_PUBLIC_BACKEND_BASE_URL || "";
  const result = {
    env: {
      NEXT_PUBLIC_BACKEND_BASE_URL: backend || null,
      NEXT_PUBLIC_USE_LOCAL_PROXY: process.env.NEXT_PUBLIC_USE_LOCAL_PROXY || null,
      BACKEND_BASE_URL: process.env.BACKEND_BASE_URL ? "(set, server-only)" : null,
      VERCEL_REGION: process.env.VERCEL_REGION || null,
    },
  };

  if (!backend) {
    return Response.json({ ...result, reachable: false, error: "NEXT_PUBLIC_BACKEND_BASE_URL not set at runtime" });
  }

  const started = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(backend + "/", { signal: controller.signal });
    clearTimeout(timeout);
    return Response.json({
      ...result,
      reachable: true,
      status: res.status,
      elapsedMs: Date.now() - started,
    });
  } catch (err) {
    return Response.json({
      ...result,
      reachable: false,
      errorName: err?.name,
      errorMessage: err?.message,
      elapsedMs: Date.now() - started,
    });
  }
}
