import { getAccountSession, withSmsAuth } from "@/lib/auth/session";
import { encodePayload } from "@/utils/payloadEncoding";
import { hasBackendOrigin, resolveServerBackendOrigin } from "@/utils/backendOrigin";

/**
 * Marksheet upload for the AI Course Advisor (Step 3). A Route Handler rather
 * than a Server Action because Server Actions cap request bodies at 1 MB.
 * Deliberately outside proxy.js's matcher (".../step/:path*"): the proxy only
 * buffers 10 MB of a body, which would silently cut a larger upload short.
 * Identity is established via the Bearer token in withSmsAuth; no
 * userId/loginHash in the payload body is needed.
 *
 * Browser sends multipart "files" (already downscaled by utils/marksheetFiles);
 * this forwards to {schoolUUID}/student/enrollment/ai-course-advisor/marksheet/upload.
 */

// Vercel functions accept ~4.5 MB request bodies; the browser keeps uploads under this.
const MAX_TOTAL_BYTES = 4.4 * 1024 * 1024;

export async function POST(request) {
  const session = await getAccountSession();
  if (!session?.userId || !session.schoolUUID) {
    return Response.json({ status: "3" });
  }
  if (!hasBackendOrigin()) {
    return Response.json({ status: "2", message: "The AI Suggester is not available right now." });
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ status: "0", statusCode: "FILE_TYPE", message: "Please choose a PDF or photo of your marksheet." });
  }
  const files = form.getAll("files").filter((file) => typeof file === "object" && file.size > 0);
  const total = files.reduce((sum, file) => sum + file.size, 0);
  if (files.length === 0) {
    return Response.json({ status: "0", statusCode: "FILE_TYPE", message: "Please choose a PDF or photo of your marksheet." });
  }
  if (total > MAX_TOTAL_BYTES) {
    return Response.json({ status: "0", statusCode: "FILE_TOO_LARGE", message: "These files are too large together. Please upload fewer or smaller files." });
  }

  const outgoing = new FormData();
  // Add Another Student names the child; the backend checks it belongs to this parent.
  const studentUserId = Number(form.get("studentUserId")) || null;
  outgoing.append("payload", encodePayload(studentUserId ? { studentUserId } : {}));
  files.forEach((file) => outgoing.append("files", file, file.name || "marksheet"));

  const response = await fetch(
    `${await resolveServerBackendOrigin()}/${session.schoolUUID}/student/enrollment/ai-course-advisor/marksheet/upload`,
    await withSmsAuth({ method: "POST", body: outgoing })
  );
  if (!response.ok) {
    return Response.json({ status: "2", message: "We couldn't read your marksheet right now. You can continue without it." });
  }
  const text = await response.text();
  try {
    return Response.json(JSON.parse(text));
  } catch {
    return Response.json({ status: "2", message: "We couldn't read your marksheet right now. You can continue without it." });
  }
}
