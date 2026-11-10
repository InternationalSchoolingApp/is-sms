/**
 * Announcement attachments come back as a bare filename (e.g.
 * "667420445.jpeg") — the legacy frontend resolves it by concatenating the
 * backend's FILE_UPLOAD_PATH (a per-environment S3 base URL injected into
 * the legacy JSP page model, e.g. "https://s3.amazonaws.com/internationalsch/"
 * in prod, "https://s3.amazonaws.com/testseri/" in dev/uat — see
 * is-rest-api's application-*.yml) directly in front of it. Same base must
 * be set here per environment via NEXT_PUBLIC_FILE_UPLOAD_BASE_URL.
 */
const FILE_UPLOAD_BASE_URL = process.env.NEXT_PUBLIC_FILE_UPLOAD_BASE_URL || "https://s3.amazonaws.com/testseri/";

export function getAttachmentUrl(attachment) {
  if (!attachment) return null;
  return `${FILE_UPLOAD_BASE_URL}${attachment}`;
}

// Legacy derives fileType server-side from the extension (png/jpg/jpeg -> "IMAGE", else "FILE").
export function isImageAttachment(attachment) {
  return /\.(png|jpe?g)$/i.test(attachment || "");
}
