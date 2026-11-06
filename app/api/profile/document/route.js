import { NextResponse } from "next/server";
import { backendRequest } from "@/utils/backendRequest";
import { PROFILE_DOC_TYPES, loadMyProfileFacts } from "@/services/profileFacts";

/**
 * My Profile > Documents: upload one proof (Age Proof, Address Proof, Parent Passport = "Signature", Last Academic
 * Proof). The browser posts multipart form data { docType, file }; this turns the file into the data URL the existing
 * endpoint expects and calls {school}/dashboard/save-docs with
 *   { userId (token user), studentStandardId (from the user's own profile), documentUploads: [{ filePath, fileName, docType }] }
 * (profileViewNew.js saveDocs / cropperImage.js). A route, not a Server Action, so a 5 MB file is not cut by the
 * Server Action body limit. JPG / PNG / PDF up to 5 MB, as on the existing page.
 */

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = { "image/jpeg": "jpg", "image/png": "png", "application/pdf": "pdf" };

const reply = (status, body) => NextResponse.json(body, { status });

export async function POST(request) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return reply(400, { message: "No file was sent." });
  }
  const docType = String(form.get("docType") || "");
  const file = form.get("file");
  if (!PROFILE_DOC_TYPES.includes(docType)) return reply(400, { message: "Unknown document." });
  if (!file || typeof file === "string") return reply(400, { message: "Please choose a file." });
  const ext = TYPES[file.type];
  if (!ext) return reply(400, { message: "Please choose a JPG, PNG or PDF file." });
  if (file.size > MAX_BYTES) return reply(400, { message: "The file must be 5 MB or smaller." });

  const facts = await loadMyProfileFacts();
  if (!facts.ok) return reply(facts.sessionExpired ? 401 : 400, { message: facts.message, sessionExpired: Boolean(facts.sessionExpired) });

  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  const fileName = `${ext === "pdf" ? "abc" : "file"}${Math.random().toString().slice(2)}.${ext}`;
  const result = await backendRequest({
    path: "dashboard/save-docs",
    buildBody: (me) => ({
      userId: me.userId,
      studentStandardId: facts.data.studentStandardId,
      documentUploads: [{ filePath: `data:${file.type};base64,${base64}`, fileName, docType, imgID: "" }],
    }),
  });
  if (!result.ok) return reply(result.sessionExpired ? 401 : 502, { message: result.message, sessionExpired: Boolean(result.sessionExpired) });
  const answer = result.data || {};
  if (["0", "2", "3"].includes(String(answer.status ?? ""))) {
    return reply(400, { message: answer.MESSAGE || answer.message || "The document could not be saved." });
  }
  return reply(200, { message: answer.MESSAGE || answer.message || "Document saved." });
}
