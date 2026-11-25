/**
 * Re-enrollment "Download your transcript" card — pure mapper + every line of its copy (plan v3, sections 5 and 6).
 *
 *   mapReEnrollmentDocuments(response) -> { state, gradeName, links, showDiploma, heading, reasons[] }
 *
 *   state "hidden"      : nothing to show (no response / 404 old backend / E003 / E004 / EX01 / available without a link)
 *   state "session-out" : status "3" -> the card calls expireSession
 *   state "ready"       : Download enabled (links.transcript, + links.diploma for a Grade 12 PASS)
 *   state "blocked"     : Download disabled + reasons[] in display order TRANSCRIPT_ON_HOLD -> DOCUMENTS_PENDING ->
 *                         DOCUMENTS_REJECTED -> DOCUMENTS_UNDER_VERIFICATION (-> NOT_AVAILABLE), each with its own
 *                         same-page fix (none for the school hold or the verification).
 *
 * After the last missing document is uploaded the transcript is NOT ready at once (user decision): the documents go to
 * support for verification ("generated within 24 hours"), so DOCUMENTS_PENDING turns into DOCUMENTS_UNDER_VERIFICATION and
 * Download stays disabled. An admin then marks each document verified or not verified: a "not verified" document comes
 * back as DOCUMENTS_REJECTED with the admin's reason and is re-uploaded here (then it waits for verification again). Once
 * every document is verified the backend sends `available` with the links.
 *
 * Pending fees are not a card reason (user decision: the onboarding overdue-fee gate handles them). Any other code the
 * backend may still send (e.g. an old FEE_PENDING) is ignored; blocked with nothing known left -> NOT_AVAILABLE (fail closed).
 *
 * The backend sends links only when nothing blocks the download, so a blocked card can never offer one.
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_BASE_URL || "";

export const STATUS_SUCCESS = "1";
export const STATUS_SESSION_OUT = "3";

export const BLOCKER_ON_HOLD = "TRANSCRIPT_ON_HOLD";
export const BLOCKER_DOCUMENTS = "DOCUMENTS_PENDING";
export const BLOCKER_REJECTED = "DOCUMENTS_REJECTED";
export const BLOCKER_UNDER_VERIFICATION = "DOCUMENTS_UNDER_VERIFICATION";
export const BLOCKER_NOT_AVAILABLE = "NOT_AVAILABLE";

// Display order on the card (plan v3 D12): the school hold on top, then the fixes the student can make.
const BLOCKER_ORDER = [BLOCKER_ON_HOLD, BLOCKER_DOCUMENTS, BLOCKER_REJECTED, BLOCKER_UNDER_VERIFICATION, BLOCKER_NOT_AVAILABLE];

export const DOC_STATUS_MISSING = "MISSING";
export const DOC_STATUS_UPLOADED = "UPLOADED";
export const DOC_STATUS_VERIFIED = "VERIFIED";
export const DOC_STATUS_REJECTED = "REJECTED";

/** A document that is in (uploaded, or already verified): it can be viewed, nothing is left to do on it. */
export const isDocumentIn = (doc) => doc?.status === DOC_STATUS_UPLOADED || doc?.status === DOC_STATUS_VERIFIED;
/** A document the student must upload (again): not uploaded yet, or marked not verified by the admin. */
export const needsUpload = (doc) => doc?.status === DOC_STATUS_MISSING || doc?.status === DOC_STATUS_REJECTED;

// The admin's 3 academic documents and the profile upload's docType for each (Parent Passport is saved as "Signature").
export const ACADEMIC_DOCS = [
  { label: "Age Proof", docType: "Age Proof" },
  { label: "Parent Passport", docType: "Signature" },
  { label: "Last academic proof", docType: "Last Academic Proof" },
];

export const COPY = {
  title: "Download your transcript",
  newBadge: "NEW",
  download: "Download",
  downloadTranscript: "Download Transcript",
  downloadDiploma: "Download Diploma",
  loading: "Checking your transcript…",
  ready: (grade) => (grade ? `Your ${grade} transcript is ready to download.` : "Your transcript is ready to download."),
  blockedOne: (grade) => (grade ? `Your ${grade} transcript is not available yet.` : "Your transcript is not available yet."),
  blockedMany: (grade) => (grade ? `Complete these steps to download your ${grade} transcript.` : "Complete these steps to download your transcript."),
  downloadDisabledHint: "Complete the steps below first",
  // TRANSCRIPT_ON_HOLD — admin "Publish without Show" (SHOW_TRANSCRIPT_TO_STUDENT = N).
  holdTitle: "Your transcript has been published, but it is on hold.",
  holdReason: "Reason:",
  holdRemark: "Remark:",
  holdContact: "Please contact the school to release it.",
  holdContactGeneric: "Please contact the school.",
  talkToUs: "Talk to us",
  // DOCUMENTS_PENDING
  docsTitle: "Mandatory documents missing:",
  docsHint: "Upload them here to unlock your transcript.",
  docsHintElsewhere: "Upload them to unlock your transcript.",
  docStatus: {
    [DOC_STATUS_MISSING]: "Not uploaded",
    [DOC_STATUS_UPLOADED]: "Uploaded",
    [DOC_STATUS_VERIFIED]: "Verified",
    [DOC_STATUS_REJECTED]: "Not verified",
  },
  upload: "Upload",
  hideUpload: "Hide",
  uploadPanelTitle: "Upload documents",
  uploadPanelSubtitle: "— same upload as My Profile → Documents, done here",
  uploadPanelNote: "PDF, JPG or PNG up to 5 MB. Once all mandatory documents are uploaded, your transcript will be generated within 24 hours.",
  docsDoneTitle: "Your mandatory documents",
  viewDocument: "View",
  loadingView: "Loading…",
  previewTitle: "Preview File",
  loadingPreview: "Loading the file…",
  previewFailed: "The file could not be loaded. Please try again.",
  downloadPdf: "Download PDF",
  chooseFile: "Choose file",
  changeFile: "Change",
  uploading: "Uploading…",
  // DOCUMENTS_UNDER_VERIFICATION — every mandatory document uploaded, support verifies them; Download stays disabled.
  underVerificationTitle: "Your documents have been uploaded successfully.",
  underVerificationText: "Your transcript will be generated within 24 hours.",
  // DOCUMENTS_REJECTED — an admin marked a document "not verified"; the student re-uploads it.
  rejectedOne: "Please re-upload your document. It is marked not verified due to this reason:",
  rejectedMany: "Please re-upload these documents. Each is marked not verified due to the reason shown:",
  rejectedReasonLabel: "Reason:",
  rejectedNoReason: "No reason was given.",
  rejectedHint: "Upload the corrected file here. It will be checked again within 24 hours.",
  reupload: "Re-upload",
  // NOT_AVAILABLE
  notAvailable: "Your transcript cannot be checked right now. Please try again later.",
  tryAgain: "Try again",
  // My Transcript (Phase 4): a blocked grade's row
  blockedRow: (label) => `${label} is not available yet.`,
  fixOnReEnrollment: "Fix this on the re-enrollment page",
  // Dummy (demo) student mode
  demoDownload: "Transcript download is not available in demo mode.",
};

const text = (value) => (value == null ? "" : String(value).trim());

function backendHref(path) {
  const p = text(path);
  if (!p) return null;
  if (/^https?:\/\//i.test(p)) return p;
  return `${BACKEND_URL}${p.startsWith("/") ? "" : "/"}${p}`;
}

// The download link of a transcript / diploma: the forDownload=true path when the backend sends one, else the view path.
function linkOf(doc) {
  if (!doc) return null;
  return backendHref(doc.downloadPath) || backendHref(doc.viewPath);
}

// The link of the View button: the view path when the backend sends one, else the download path.
function viewLinkOf(doc) {
  if (!doc) return null;
  return backendHref(doc.viewPath) || backendHref(doc.downloadPath);
}

/**
 * The blocker code of a documents list, the way the backend decides it: a missing document -> DOCUMENTS_PENDING, else a
 * rejected one -> DOCUMENTS_REJECTED, else (all uploaded / verified, support still to verify) -> DOCUMENTS_UNDER_VERIFICATION.
 */
function documentsCodeOf(items) {
  if (items.some((item) => text(item?.status).toUpperCase() === DOC_STATUS_MISSING)) return BLOCKER_DOCUMENTS;
  if (items.some((item) => text(item?.status).toUpperCase() === DOC_STATUS_REJECTED)) return BLOCKER_REJECTED;
  return BLOCKER_UNDER_VERIFICATION;
}

const DOCUMENT_BLOCKERS = [BLOCKER_DOCUMENTS, BLOCKER_REJECTED, BLOCKER_UNDER_VERIFICATION];

/**
 * An upload of a document, shown at once (no wait for the documents API): the document turns UPLOADED (its rejection reason
 * is dropped) in the cached answer and the documents blocker takes the code that fits what is left: missing -> pending,
 * rejected -> rejected, nothing left -> DOCUMENTS_UNDER_VERIFICATION (support verifies them; other blockers, e.g. the school
 * hold, stay). Never makes the answer `available`. Always followed by a refetch: the backend stays the truth.
 */
export function markDocumentUploaded(response, docType) {
  if (!response || typeof response !== "object" || !Array.isArray(response.blockers)) return response;
  const blockers = response.blockers.map((blocker) => {
    if (!DOCUMENT_BLOCKERS.includes(text(blocker?.code).toUpperCase())) return blocker;
    const items = (Array.isArray(blocker.items) ? blocker.items : []).map((item) => {
      if (text(item?.docType) !== docType) return item;
      const { reason: _dropped, ...rest } = item;
      return { ...rest, status: DOC_STATUS_UPLOADED };
    });
    // No items (old backend answer): the code is only kept when it is not the documents one.
    if (!items.length) return text(blocker.code).toUpperCase() === BLOCKER_DOCUMENTS ? { code: BLOCKER_UNDER_VERIFICATION } : blocker;
    return { ...blocker, code: documentsCodeOf(items), items };
  });
  return { ...response, blockers };
}

/** On-hold copy (plan v3 section 5): reason + remark from the admin; blank remark -> no line; blank reason -> generic line. */
export function holdLines(blocker) {
  const reason = text(blocker?.reason);
  const remark = text(blocker?.remark);
  if (!reason) return { title: COPY.holdTitle, reason: "", remark: "", contact: COPY.holdContactGeneric };
  return { title: COPY.holdTitle, reason, remark, contact: COPY.holdContact };
}

const KNOWN_DOC_STATUSES = [DOC_STATUS_UPLOADED, DOC_STATUS_VERIFIED, DOC_STATUS_REJECTED];

function docsOf(blocker) {
  const items = Array.isArray(blocker?.items) ? blocker.items : [];
  return items
    .map((item) => {
      const raw = text(item.status).toUpperCase();
      const status = KNOWN_DOC_STATUSES.includes(raw) ? raw : DOC_STATUS_MISSING;
      return {
        label: text(item.label) || text(item.docType),
        docType: text(item.docType),
        status,
        reason: status === DOC_STATUS_REJECTED ? text(item.reason) : "",
      };
    })
    .filter((item) => item.docType);
}

/** One entry per blocker shown on the card, already in display order. */
function reasonsOf(blockers) {
  const byCode = new Map();
  (Array.isArray(blockers) ? blockers : []).forEach((blocker) => {
    const code = text(blocker?.code).toUpperCase();
    if (BLOCKER_ORDER.includes(code) && !byCode.has(code)) byCode.set(code, blocker);
  });
  const reasons = [];
  BLOCKER_ORDER.forEach((code) => {
    const blocker = byCode.get(code);
    if (!blocker) return;
    if (code === BLOCKER_ON_HOLD) reasons.push({ code, hold: holdLines(blocker) });
    if (code === BLOCKER_DOCUMENTS) {
      const docs = docsOf(blocker);
      const missing = docs.filter((d) => d.status === DOC_STATUS_MISSING);
      const rejected = docs.filter((d) => d.status === DOC_STATUS_REJECTED);
      // Uploaded = done (plan v3 D7): nothing missing or rejected left -> nothing to fix here.
      if (missing.length || rejected.length || !docs.length) reasons.push({ code, docs, missing, rejected });
    }
    if (code === BLOCKER_REJECTED) {
      const docs = docsOf(blocker);
      const rejected = docs.filter((d) => d.status === DOC_STATUS_REJECTED);
      // No document the student can re-upload (old / odd answer): still blocked, shown as "being verified".
      reasons.push(rejected.length ? { code, docs, rejected, missing: [] } : { code: BLOCKER_UNDER_VERIFICATION, docs });
    }
    if (code === BLOCKER_UNDER_VERIFICATION) reasons.push({ code, docs: docsOf(blocker) });
    if (code === BLOCKER_NOT_AVAILABLE) reasons.push({ code });
  });
  return reasons;
}

const HIDDEN = Object.freeze({ state: "hidden" });

/**
 * response: the re-enrollment/documents answer (or null / undefined when the call failed).
 */
export function mapReEnrollmentDocuments(response) {
  if (!response || typeof response !== "object") return HIDDEN;
  const status = text(response.status);
  if (status === STATUS_SESSION_OUT) return { state: "session-out" };
  if (status !== STATUS_SUCCESS) return HIDDEN;

  const gradeName = text(response.gradeName);
  const passed = text(response.result).toUpperCase() === "PASS";
  // Diploma: Grade 12 PASS only (plan v3 D13); disabled with the transcript while anything blocks it.
  const diplomaGrade = passed && /^grade\s*12$/i.test(gradeName);

  if (response.available === true) {
    const transcript = linkOf(response.transcript);
    if (!transcript) return HIDDEN;
    const diploma = linkOf(response.diploma);
    return {
      state: "ready",
      gradeName,
      links: {
        transcript,
        transcriptView: viewLinkOf(response.transcript),
        diploma,
        diplomaView: viewLinkOf(response.diploma),
      },
      showDiploma: Boolean(diploma),
      heading: COPY.ready(gradeName),
      reasons: [],
    };
  }

  let reasons = reasonsOf(response.blockers);
  // Blocked without a blocker the card knows: fail closed, nothing to download.
  if (!reasons.length) reasons = [{ code: BLOCKER_NOT_AVAILABLE }];
  return {
    state: "blocked",
    gradeName,
    links: { transcript: null, diploma: null },
    showDiploma: diplomaGrade,
    heading: reasons.length > 1 ? COPY.blockedMany(gradeName) : COPY.blockedOne(gradeName),
    reasons,
  };
}

/** Dummy (demo) student mode: a ready card, no API call (its Download only shows a note). */
export function demoReEnrollmentDocuments(gradeName) {
  return {
    state: "ready",
    demo: true,
    gradeName: text(gradeName),
    links: { transcript: "#", transcriptView: "#", diploma: null, diplomaView: null },
    showDiploma: false,
    heading: COPY.ready(text(gradeName)),
    reasons: [],
  };
}

/* ── My Transcript (Phase 4): a row the backend marks transcriptBlocked shows these reasons instead of its links. ── */

/**
 * transcriptBlockers of a My Transcript row (same objects as the documents endpoint's blockers) -> reasons[] in display
 * order, same shape and copy as the card's. A blocked row without a blocker the card knows -> NOT_AVAILABLE.
 */
export function transcriptBlockReasons(blockers) {
  const reasons = reasonsOf(blockers);
  return reasons.length ? reasons : [{ code: BLOCKER_NOT_AVAILABLE }];
}

/* ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
 * TEMPORARY DEV MOCK — remove once is-rest-api answers POST {school}/api/v1/student/re-enrollment/documents.
 *
 * Off unless switched on, and never in a production build (NODE_ENV === "production" always returns null).
 * Switch on (dev only), either:
 *   - URL:  /{school}/student/re-enrollment?transcriptMock=<scenario>
 *   - env:  NEXT_PUBLIC_RE_ENROLLMENT_DOCS_MOCK=<scenario>   (.env.local, restart `next dev`)
 * Switch off: drop the URL param / env var (or ?transcriptMock=off to override the env var for one visit).
 * Scenarios: ready, docs, multi, g12, fail, hold, all, verifying, rejected, rejectedmany (+ holdgeneric, notavailable, oldfee, e004). No fee scenarios: pending fees
 * are not a card reason any more (oldfee = a backend still sending FEE_PENDING -> NOT_AVAILABLE).
 * Upload is simulated in memory while the mock is on (no backend call), so a refetch shows the change: the last missing
 * document turns the documents blocker into DOCUMENTS_UNDER_VERIFICATION (what documents-uploaded does on the backend).
 * ───────────────────────────────────────────────────────────────────────────────────────────────────────────── */

const MOCK_LINK = { viewPath: "/dashboard/student-transcript-view-after-publish/mock", downloadPath: "/dashboard/student-transcript-view-after-publish/mock?forDownload=true" };
const MOCK_DIPLOMA = { viewPath: "/dashboard/view-diploma/mock", downloadPath: "/dashboard/view-diploma/mock?forDownload=true" };
// A status string, or [status, reason] for a rejected document.
const mockItem = (d, value) => (Array.isArray(value) ? { ...d, status: value[0], reason: value[1] } : { ...d, status: value });
const mockDocs = (a, p, l) => {
  const items = ACADEMIC_DOCS.map((d, i) => mockItem(d, [a, p, l][i]));
  return { code: documentsCodeOf(items), items };
};
const M = DOC_STATUS_MISSING;
const U = DOC_STATUS_UPLOADED;
const V = DOC_STATUS_VERIFIED;
const R = (reason) => [DOC_STATUS_REJECTED, reason];

const MOCK_SCENARIOS = {
  ready: { gradeName: "Grade 10", result: "PASS", blockers: [] },
  docs: { gradeName: "Grade 5", result: "PASS", blockers: [mockDocs(U, M, U)] },
  multi: { gradeName: "Grade 7", result: "PASS", blockers: [mockDocs(M, M, U)] },
  g12: { gradeName: "Grade 12", result: "PASS", blockers: [] },
  fail: { gradeName: "Grade 9", result: "FAIL", blockers: [] },
  hold: {
    gradeName: "Grade 8",
    result: "PASS",
    blockers: [{ code: BLOCKER_ON_HOLD, reason: "Pending fee clearance", remark: "Please contact the accounts team before 30 Nov to clear the old balance." }],
  },
  all: {
    gradeName: "Grade 12",
    result: "PASS",
    blockers: [{ code: BLOCKER_ON_HOLD, reason: "Disciplinary review", remark: "" }, mockDocs(U, M, U)],
  },
  verifying: { gradeName: "Grade 9", result: "PASS", blockers: [mockDocs(U, U, U)] },
  rejected: { gradeName: "Grade 9", result: "PASS", blockers: [mockDocs(V, R("The photo is blurry. Please upload a clear scan of the passport page."), U)] },
  rejectedmany: { gradeName: "Grade 9", result: "PASS", blockers: [mockDocs(R("The document is cropped, the date of birth is not visible."), R("Wrong file uploaded."), V)] },
  holdgeneric: { gradeName: "Grade 8", result: "PASS", blockers: [{ code: BLOCKER_ON_HOLD, reason: "", remark: "" }] },
  notavailable: { gradeName: "Grade 10", result: "PASS", blockers: [{ code: BLOCKER_NOT_AVAILABLE }] },
  oldfee: { gradeName: "Grade 10", result: "PASS", blockers: [{ code: "FEE_PENDING", items: [{ userPaymentDetailsId: 1, amount: 250 }] }] },
  e004: { status: "0", statusCode: "E004" },
};

// In-memory changes made while the mock is on (uploads), kept until a full page reload.
const mockState = { key: null, scenario: null };

function mockScenarioName() {
  if (process.env.NODE_ENV === "production" || typeof window === "undefined") return null;
  let fromUrl = null;
  try {
    fromUrl = new URLSearchParams(window.location.search).get("transcriptMock");
  } catch {
    fromUrl = null;
  }
  const name = text(fromUrl ?? process.env.NEXT_PUBLIC_RE_ENROLLMENT_DOCS_MOCK).toLowerCase();
  if (!name || name === "off") return null;
  return Object.hasOwn(MOCK_SCENARIOS, name) ? name : "ready";
}

/** True while the dev mock answers instead of the backend. */
export function isReEnrollmentDocsMock() {
  return mockScenarioName() !== null;
}

function mockScenario() {
  const name = mockScenarioName();
  if (!name) return null;
  if (mockState.key !== name) {
    mockState.key = name;
    mockState.scenario = JSON.parse(JSON.stringify(MOCK_SCENARIOS[name]));
  }
  return mockState.scenario;
}

/** The mock's answer, built like the backend's (links only when nothing blocks), or null when the mock is off. */
export async function mockReEnrollmentDocumentsResponse() {
  const s = mockScenario();
  if (!s) return null;
  await new Promise((resolve) => setTimeout(resolve, 450));
  if (s.status) return { status: s.status, statusCode: s.statusCode, message: "Mock: not eligible" };
  const blockers = s.blockers;
  const available = blockers.length === 0;
  const diploma = s.result === "PASS" && /^grade\s*12$/i.test(s.gradeName);
  return {
    status: STATUS_SUCCESS,
    available,
    gradeName: s.gradeName,
    result: s.result,
    transcript: available ? MOCK_LINK : null,
    diploma: available && diploma ? MOCK_DIPLOMA : null,
    blockers,
  };
}

/** Mock upload: the document turns UPLOADED (reason dropped); the blocker takes the code of what is left, like the backend. */
export async function mockUploadDocument(docType) {
  const s = mockScenario();
  if (!s) return false;
  await new Promise((resolve) => setTimeout(resolve, 700));
  s.blockers = s.blockers.map((b) => {
    if (!Array.isArray(b.items) || !DOCUMENT_BLOCKERS.includes(b.code)) return b;
    const items = b.items.map((d) => {
      if (d.docType !== docType) return d;
      const { reason: _dropped, ...rest } = d;
      return { ...rest, status: DOC_STATUS_UPLOADED };
    });
    return { ...b, code: documentsCodeOf(items), items };
  });
  return true;
}
