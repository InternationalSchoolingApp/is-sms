/**
 * Step 4 of the teacher registration ("Contract"): the pure parts. Mirrors the legacy JSP wizard (signupTeacherContent.js
 * getContractDetailsContent, signupTeacherStage4.js, jquery.commonFunction.js handleRecipientSignatureUpload) with the
 * decisions that moved to the server: whether the contract is ready or expired, the letterhead data, the signed
 * contract itself. Dependency-free (no DOM, no "@/" imports), so it behaves the same in the browser and in tests
 * (scripts/verifyTeacherContract.mjs).
 */

// What the backend says about the teacher's contract (TeacherContractRules.State).
export const CONTRACT_STATE = {
  NOT_READY: "NOT_READY", // the school has not published one yet
  READY: "READY", // published, not accepted, not expired
  EXPIRED: "EXPIRED", // published, but its validity has ended
  ACCEPTED: "ACCEPTED",
};

export const TEACHER_SIGNATURE_MAX_BYTES = 300 * 1024;
const SIGNATURE_TYPES = ["image/jpeg", "image/jpg", "image/png"];

// The legacy wording, word for word.
export const SIGNATURE_HINT = "Please upload your signature image (PNG/JPG only, white/transparent background, max size: 300KB).";
export const SIGNATURE_REQUIRED_MESSAGE = "Please upload your signature";
export const DECLARATION_REQUIRED_MESSAGE = "Please Accept the Declaration.";
export const NO_SIGNATURE_AREA_MESSAGE = "This contract has no signature area. Please contact the administration.";
export const CONTRACT_DECLARATION_TEXT =
  "I hereby confirm that I have read and agree to the Terms. I understand that this agreement is digitally signed and does not require a physical signature.";
export const CONTRACT_CONFIRM_TEXT = "Please note that once the contract is accepted, you will not be able to go back to the previous step.";

/** The message for a signature file the server would refuse (not a JPG/PNG, over 300 KB), or null. */
export function validateSignatureFile(file) {
  if (!file) return SIGNATURE_REQUIRED_MESSAGE;
  if (!SIGNATURE_TYPES.includes(String(file.type ?? "").toLowerCase())) return "Only JPG or PNG images are allowed.";
  if (file.size > TEACHER_SIGNATURE_MAX_BYTES) return "File size must be less than 300 KB.";
  return null;
}

/** A letterhead / logo address the page may show: only http(s) (never a script or data URL from the server's data). */
export function isSafeImageUrl(value) {
  try {
    const url = new URL(String(value ?? "").trim());
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * get-teacher-signup-agreement-details -> what the screen needs, or null when the answer is not a success.
 *   { state, contract: { agreementLogId, content, recipientName, locationLine, publishDate, publishTime, schoolAddress,
 *                        letterHeadImage, fullName } | null }
 * `state` is the backend's (never worked out here, so the browser's clock decides nothing); an unknown state, or a READY
 * one without a contract to show, is NOT_READY. Missing pieces are empty strings (the legacy page printed "undefined").
 */
export function mapContractDetails(response) {
  if (!response || String(response.status) !== "1") return null;
  const details = response.details?.teacherAgreementDetails;
  if (!details || typeof details !== "object") return null;
  const claimed = Object.hasOwn(CONTRACT_STATE, details.contractState) ? details.contractState : CONTRACT_STATE.NOT_READY;
  const agreementLogId = Number(details.agreementLogId) > 0 ? String(details.agreementLogId) : "";
  const content = typeof details.content === "string" ? details.content : "";
  const showable = Boolean(agreementLogId && content.trim());
  if (!showable) {
    return { state: claimed === CONTRACT_STATE.ACCEPTED ? CONTRACT_STATE.ACCEPTED : CONTRACT_STATE.NOT_READY, contract: null };
  }
  const salutation = String(details.salutation ?? "").trim();
  const name = String(details.name ?? "").trim();
  return {
    state: claimed,
    contract: {
      agreementLogId,
      content,
      fullName: name,
      recipientName: [salutation ? `${salutation}.` : "", name].filter(Boolean).join(" "),
      locationLine: [details.city, details.state, details.country]
        .map((part) => String(part ?? "").trim())
        .filter(Boolean)
        .join(", "),
      publishDate: String(details.publishDateText ?? ""),
      publishTime: String(details.publishTimeText ?? ""),
      schoolAddress: String(details.schoolAddress ?? ""),
      letterHeadImage: isSafeImageUrl(details.letterHeadImage) ? String(details.letterHeadImage).trim() : "",
    },
  };
}

/** "Nov 16, 2026": the date the signature area shows, in the same format as the school's own date beside it. */
export function formatSignDate(date) {
  const month = new Intl.DateTimeFormat("en-US", { month: "short" }).format(date);
  return `${month} ${String(date.getDate()).padStart(2, "0")}, ${date.getFullYear()}`;
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** `html` with the content of the element whose id is `id` replaced by `inner`, or null when there is no such element. */
function replaceInner(html, id, inner) {
  const open = new RegExp(`<([a-zA-Z][a-zA-Z0-9]*)\\b[^>]*?(?<![\\w-])id\\s*=\\s*(["'])${escapeRegExp(id)}\\2[^>]*>`, "i");
  const opening = open.exec(html);
  if (!opening || opening[0].endsWith("/>")) return null;
  const tag = opening[1];
  const innerStart = opening.index + opening[0].length;
  const next = new RegExp(`<(/?)${escapeRegExp(tag)}\\b[^>]*>`, "gi");
  next.lastIndex = innerStart;
  let depth = 1;
  for (let found = next.exec(html); found; found = next.exec(html)) {
    if (found[1]) {
      depth -= 1;
      if (depth === 0) return html.slice(0, innerStart) + inner + html.slice(found.index);
    } else if (!found[0].endsWith("/>")) {
      depth += 1;
    }
  }
  return null;
}

/** Does the contract have the empty box the teacher's signature goes in (the admin editor always writes it)? */
export function hasSignatureArea(html) {
  return replaceInner(String(html ?? ""), "rightSignatureBox", "") !== null;
}

/**
 * The contract as the teacher will have signed it, for the screen: their chosen image in the signature box and today's
 * date next to it, where the legacy page put them. Display only: the signed contract itself is put together by the
 * server from the published one and the image. `signatureDataUri` is the data URL the browser read the chosen file as.
 */
export function previewContractWithSignature(html, signatureDataUri, dateText) {
  const source = String(html ?? "");
  if (!signatureDataUri) return source;
  // display:block + auto margins centre it in the box whatever text-align the editor left on the cell (the server writes the
  // same style into the signed copy, see TeacherContractHtml).
  const image = `<img src="${signatureDataUri}" alt="Recipient Signature" style="display:block;margin:0 auto;max-width:120px;">`;
  const signed = replaceInner(source, "rightSignatureBox", image);
  if (signed === null) return source;
  const safeDate = String(dateText).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return replaceInner(signed, "rightDate", safeDate) ?? signed;
}

/** "Nov 16, 2026 06:30 PM" for the footer's full publish date-time; "" when either part is missing. */
export function publishDateTimeText(contract) {
  return contract?.publishDate && contract?.publishTime ? `${contract.publishDate} ${contract.publishTime}` : contract?.publishDate || "";
}
