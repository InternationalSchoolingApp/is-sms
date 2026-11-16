import { getAccountSession, withSmsAuth } from "@/lib/auth/session";
import { hasBackendOrigin, resolveServerBackendOrigin } from "@/utils/backendOrigin";
import { TEACHER_DOCUMENTS, TEACHER_DOCUMENT_MAX_BYTES, validateTeacherDocumentFile } from "@/utils/teacherProfessionalDetails";

/**
 * One document of the teacher registration's professional-details step. A Route Handler rather than a Server Action
 * because Server Actions cap request bodies at 1 MB, and so that the browser can report upload progress (XHR).
 * Deliberately outside proxy.js's matcher (the teacher steps and the landing page only): the proxy buffers 10 MB of a
 * body. Identity comes from the signed-in session (the bearer token via withSmsAuth), the uniqueId sent to the backend
 * is the session's own, never one the browser names.
 *
 * Browser sends multipart "file" and "fileType"; this forwards them to {schoolUUID}/teacher/signup/upload-document,
 * which checks the type, the size and the file's real content before storing it, and answers
 *   { status: "1", fileType, originalName, fileUrl }  or  { status: "0", message }.
 */

const ALLOWED_FILE_TYPES = new Set(TEACHER_DOCUMENTS.map((doc) => doc.fileType));

function failure(message, httpStatus = 200) {
  return Response.json({ status: "0", message }, { status: httpStatus });
}

export async function POST(request, { params }) {
  // A cross-site page must not be able to upload with this teacher's cookies: the browser always sends Origin on a POST.
  const origin = request.headers.get("origin");
  if (origin) {
    let sameOrigin = false;
    try {
      sameOrigin = new URL(origin).host === request.headers.get("host");
    } catch {}
    if (!sameOrigin) return failure("Forbidden", 403);
  }

  const { school } = await params;
  const session = await getAccountSession();
  if (!session?.userId || !session.uniqueId || !session.schoolUUID || session.schoolUUID !== school) {
    return Response.json({ status: "3" });
  }
  if (!hasBackendOrigin()) return failure("Uploads are not available right now.");

  let form;
  try {
    form = await request.formData();
  } catch {
    return failure("Please choose a JPG, PNG or PDF file.");
  }
  const file = form.get("file");
  const fileType = Number(form.get("fileType"));
  if (typeof file !== "object" || !file || !ALLOWED_FILE_TYPES.has(fileType)) {
    return failure("Please choose a JPG, PNG or PDF file.");
  }
  const problem = validateTeacherDocumentFile(file);
  if (problem) return failure(problem);
  if (file.size > TEACHER_DOCUMENT_MAX_BYTES) return failure("The file is too large.");

  const outgoing = new FormData();
  outgoing.append("uniqueId", session.uniqueId);
  outgoing.append("fileType", String(fileType));
  outgoing.append("file", file, file.name || "document");

  let response;
  try {
    response = await fetch(
      `${await resolveServerBackendOrigin()}/${session.schoolUUID}/teacher/signup/upload-document`,
      await withSmsAuth({ method: "POST", body: outgoing, cache: "no-store" })
    );
  } catch {
    return failure("We couldn't upload the document. Please try again.");
  }
  if (!response.ok) return failure("We couldn't upload the document. Please try again.");
  try {
    return Response.json(JSON.parse(await response.text()));
  } catch {
    return failure("We couldn't upload the document. Please try again.");
  }
}
