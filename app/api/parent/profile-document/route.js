import { NextResponse } from "next/server";
import { getAccountSession } from "@/lib/auth/session";
import { parentPost } from "@/services/parentApiBase";

/**
 * Parent > My Profile > profile photo upload (legacy adminProfile.js saveProfileImage: the only document the parent's
 * profile page offers; it has no other uploads and no way to view a saved document, so there is no download route).
 *
 * The browser posts multipart form data with one `file` (already cropped in the browser). The user is ALWAYS the signed-in
 * parent (session), never a value from the request: this turns the file into the data URL the backend expects and calls
 * {school}/dashboard/save-docs with { userId (session), documentUploads: [{ filePath, fileName, docType: "Profile Image" }] }.
 * The backend only checks that the session may access that userId, which it is by construction. JPG / PNG up to 5 MB, the
 * same message as the existing page. Answer: { message }; status 401 { sessionExpired: true } when the session ended.
 * A route, not a Server Action, so a 5 MB file is not cut by the Server Action body limit. The file is never logged.
 */

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = { "image/jpeg": "jpg", "image/png": "png" };
const BAD_FILE = "Please upload files in JPG, PNG, and JPEG with max size of 5MB";

const reply = (status, body) => NextResponse.json(body, { status });

export async function POST(request) {
  const me = await getAccountSession();
  if (!me?.accessToken || !me?.schoolUUID || !me?.userId) return reply(401, { message: "Your session has been logged out", sessionExpired: true });

  let form;
  try {
    form = await request.formData();
  } catch {
    return reply(400, { message: "No file was sent." });
  }
  const files = form.getAll("file");
  const file = files[0];
  if (files.length !== 1 || !file || typeof file === "string") return reply(400, { message: "Please choose a file." });
  const ext = TYPES[file.type];
  if (!ext || file.size > MAX_BYTES || file.size === 0) return reply(400, { message: BAD_FILE });

  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  // Same file name pattern as the existing page: "file<random>.<ext>".
  const fileName = `file${Math.random().toString().slice(2)}.${ext}`;
  const answer = await parentPost(me.schoolUUID, "/dashboard/save-docs", {
    userId: Number(me.userId),
    documentUploads: [{ filePath: `data:${file.type};base64,${base64}`, fileName, docType: "Profile Image", imgID: "" }],
  });
  if (!answer || typeof answer !== "object") return reply(502, { message: "The photo could not be saved. Please try again." });
  const status = String(answer.status ?? "");
  if (status === "3") return reply(401, { message: "Your session has been logged out", sessionExpired: true });
  if (status === "0" || status === "2") return reply(400, { message: answer.MESSAGE || answer.message || "The photo could not be saved." });
  return reply(200, { message: "Profile image uploaded successfully" });
}
