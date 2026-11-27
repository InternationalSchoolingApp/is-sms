import { NextResponse } from "next/server";
import { backendRequest } from "@/utils/backendRequest";
import { PROFILE_DOC_TYPES, PROFILE_PHOTO_TYPE, loadMyProfileFacts } from "@/services/profileFacts";

/**
 * My Profile > Documents: upload the proofs (Age Proof, Address Proof, Parent Passport = "Signature", Last Academic
 * Proof — one or more at once, "Save Documents") or the profile photo ("Profile Image", P4, alone). Images are already
 * cropped in the browser. The browser posts multipart form data with repeated { docType, file } pairs; this turns each file into the data URL the existing
 * endpoint expects and calls {school}/dashboard/save-docs with
 *   { userId (token user), studentStandardId (from the user's own profile), documentUploads: [{ filePath, fileName, docType }, …] }
 * (profileViewNew.js saveDocs / cropperImage.js). A route, not a Server Action, so a 5 MB file is not cut by the
 * Server Action body limit. JPG / PNG / PDF up to 5 MB, as on the existing page.
 */

const MAX_BYTES = 5 * 1024 * 1024;
const CUSTOM_FILE_TYPE = "CUSTOM_FILE";
const TYPES = { "image/jpeg": "jpg", "image/png": "png", "application/pdf": "pdf" };

const reply = (status, body) => NextResponse.json(body, { status });

export async function POST(request) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return reply(400, { message: "No file was sent." });
  }
  const docTypes = form.getAll("docType").map((value) => String(value || ""));
  const files = form.getAll("file");
  if (!docTypes.length || docTypes.length !== files.length) return reply(400, { message: "Please choose a file." });
  if (new Set(docTypes).size !== docTypes.length) return reply(400, { message: "Each document can be sent only once." });
  const photo = docTypes.includes(PROFILE_PHOTO_TYPE);
  if (photo && docTypes.length > 1) return reply(400, { message: "The profile photo is saved on its own." });
  // A school-defined file field (renderDynamicFieldByUserID, docType CUSTOM_FILE) is saved on its own, with its id.
  const custom = docTypes.includes(CUSTOM_FILE_TYPE);
  const customFieldId = String(form.get("customProfileFieldId") || "");
  if (custom && (docTypes.length > 1 || !/^\d+$/.test(customFieldId))) return reply(400, { message: "Please choose a file." });
  for (let i = 0; i < docTypes.length; i += 1) {
    const docType = docTypes[i];
    const file = files[i];
    if (!photo && !custom && !PROFILE_DOC_TYPES.includes(docType)) return reply(400, { message: "Unknown document." });
    if (!file || typeof file === "string") return reply(400, { message: "Please choose a file." });
    const ext = TYPES[file.type];
    // Same messages as the existing page (cropperImage.js cropImage).
    if (photo && (!ext || ext === "pdf" || file.size > MAX_BYTES)) return reply(400, { message: "Please upload files in JPG, PNG, and JPEG with max size of 5MB" });
    if (file.size > MAX_BYTES) return reply(400, { message: "Please upload files in PDF, JPG, PNG, and JPEG with max size of 5MB" });
    if (!ext) return reply(400, { message: "Please upload files in PDF, JPG, PNG, and JPEG Format" });
  }

  const facts = await loadMyProfileFacts();
  if (!facts.ok) return reply(facts.sessionExpired ? 401 : 400, { message: facts.message, sessionExpired: Boolean(facts.sessionExpired) });
  if (custom && !facts.data.customFields.some((f) => f.id === customFieldId && f.type === "file")) return reply(400, { message: "Unknown document." });

  // Same file names as the existing page (cropperImage.js): "file<random>.<ext>", PDFs "abc<random>.pdf".
  const documentUploads = await Promise.all(
    files.map(async (file, i) => {
      const ext = TYPES[file.type];
      const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
      const fileName = `${ext === "pdf" ? "abc" : "file"}${Math.random().toString().slice(2)}.${ext}`;
      return { filePath: `data:${file.type};base64,${base64}`, fileName, docType: docTypes[i], imgID: "" };
    }),
  );
  const result = await backendRequest({
    path: "dashboard/save-docs",
    buildBody: (me) => ({
      userId: me.userId,
      studentStandardId: facts.data.studentStandardId,
      documentUploads,
      ...(custom ? { customProfileFieldId: Number(customFieldId) } : {}),
    }),
  });
  if (!result.ok) return reply(result.sessionExpired ? 401 : 502, { message: result.message, sessionExpired: Boolean(result.sessionExpired) });
  const answer = result.data || {};
  if (["0", "2", "3"].includes(String(answer.status ?? ""))) {
    return reply(400, { message: answer.MESSAGE || answer.message || "The document could not be saved." });
  }
  return reply(200, { message: answer.MESSAGE || answer.message || "Document saved." });
}
