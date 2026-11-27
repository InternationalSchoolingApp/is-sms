import { devApiEntriesAfter, subscribeDevApiLog } from "@/utils/devApiLog";

/**
 * DEV ONLY: streams the server's outgoing API calls (endpoint, status, ms; recorded by instrumentation.js) to the
 * dashboard's DevApiConsoleLogger as Server-Sent Events. 404 outside `next dev`.
 *
 * GET ?since=<epoch ms>: also sends the calls that started since then (the page's own load, before the logger
 * mounted). On a reconnect the browser sends Last-Event-ID and only later calls are sent.
 */
export const dynamic = "force-dynamic";

export async function GET(request) {
  if (process.env.NODE_ENV !== "development") {
    return new Response("Not found", { status: 404 });
  }
  const afterId = Number(request.headers.get("last-event-id")) || 0;
  const sinceMs = Number(new URL(request.url).searchParams.get("since")) || 0;
  const encoder = new TextEncoder();
  let unsubscribe = () => {};
  let keepAlive;

  const stream = new ReadableStream({
    start(controller) {
      const send = (entry) => controller.enqueue(encoder.encode(`id: ${entry.id}\ndata: ${JSON.stringify(entry)}\n\n`));
      devApiEntriesAfter({ afterId, sinceMs }).forEach(send);
      unsubscribe = subscribeDevApiLog(send);
      keepAlive = setInterval(() => controller.enqueue(encoder.encode(": ping\n\n")), 15_000);
      request.signal.addEventListener("abort", () => {
        unsubscribe();
        clearInterval(keepAlive);
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
    cancel() {
      unsubscribe();
      clearInterval(keepAlive);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // "no" means instrumentation.js has not installed the timing wrapper yet: restart `next dev`.
      "X-Dev-Api-Timing": globalThis.__devApiTimingInstalled ? "installed" : "no",
    },
  });
}
