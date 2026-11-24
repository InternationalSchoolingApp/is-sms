/**
 * Re-enrollment "Download your transcript" card — pure mapper + every line of its copy (plan v3, sections 5 and 6).
 *
 *   mapReEnrollmentDocuments(response) -> { state, gradeName, links, showDiploma, heading, reasons[] }
 *
 *   state "hidden"      : nothing to show (no response / 404 old backend / E003 / E004 / EX01 / available without a link)
 *   state "session-out" : status "3" -> the card calls expireSession
 *   state "ready"       : Download enabled (links.transcript, + links.diploma for a Grade 12 PASS)
 *   state "blocked"     : Download disabled + reasons[] in display order TRANSCRIPT_ON_HOLD -> DOCUMENTS_PENDING
 *                         (-> NOT_AVAILABLE), each with its own same-page fix (none for the school hold).
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
export const BLOCKER_NOT_AVAILABLE = "NOT_AVAILABLE";

// Display order on the card (plan v3 D12): the school hold on top, then the fixes the student can make.
const BLOCKER_ORDER = [BLOCKER_ON_HOLD, BLOCKER_DOCUMENTS, BLOCKER_NOT_AVAILABLE];

export const DOC_STATUS_MISSING = "MISSING";
export const DOC_STATUS_UPLOADED = "UPLOADED";

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
  preparing: "Preparing…",
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
  docStatus: { [DOC_STATUS_MISSING]: "Not uploaded", [DOC_STATUS_UPLOADED]: "Uploaded" },
  upload: "Upload",
  hideUpload: "Hide",
  uploadPanelTitle: "Upload documents",
  uploadPanelSubtitle: "— same upload as My Profile → Documents, done here",
  uploadPanelNote: "PDF, JPG or PNG up to 5 MB. The transcript unlocks as soon as all mandatory documents are uploaded.",
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
 * The last upload of a document, shown at once (no wait for the documents API): the document turns UPLOADED in the cached
 * answer; with no MISSING document left the documents blocker goes, and with no blocker left at all the answer says
 * `available` with `linksPending` — the card shows View / Download right away, enabled when the silent refetch brings the
 * links (the backend only ever sends them when nothing blocks the transcript, so they cannot be made up here).
 * Always followed by a refetch: the backend stays the truth (a hold that still blocks comes back as before).
 */
export function markDocumentUploaded(response, docType) {
  if (!response || typeof response !== "object" || !Array.isArray(response.blockers)) return response;
  const blockers = response.blockers
    .map((blocker) => {
      if (text(blocker?.code).toUpperCase() !== BLOCKER_DOCUMENTS) return blocker;
      const items = (Array.isArray(blocker.items) ? blocker.items : []).map((item) =>
        text(item?.docType) === docType ? { ...item, status: DOC_STATUS_UPLOADED } : item,
      );
      const anyMissing = items.some((item) => text(item?.status).toUpperCase() !== DOC_STATUS_UPLOADED);
      return anyMissing ? { ...blocker, items } : null;
    })
    .filter(Boolean);
  if (blockers.length) return { ...response, blockers };
  return { ...response, blockers, available: true, linksPending: true };
}

/** On-hold copy (plan v3 section 5): reason + remark from the admin; blank remark -> no line; blank reason -> generic line. */
export function holdLines(blocker) {
  const reason = text(blocker?.reason);
  const remark = text(blocker?.remark);
  if (!reason) return { title: COPY.holdTitle, reason: "", remark: "", contact: COPY.holdContactGeneric };
  return { title: COPY.holdTitle, reason, remark, contact: COPY.holdContact };
}

function docsOf(blocker) {
  const items = Array.isArray(blocker?.items) ? blocker.items : [];
  return items
    .map((item) => ({
      label: text(item.label) || text(item.docType),
      docType: text(item.docType),
      status: text(item.status).toUpperCase() === DOC_STATUS_UPLOADED ? DOC_STATUS_UPLOADED : DOC_STATUS_MISSING,
    }))
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
      // Uploaded = done (plan v3 D7): no missing document left -> nothing to fix here.
      if (missing.length || !docs.length) reasons.push({ code, docs, missing });
    }
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
    if (!transcript) {
      // The last document was just uploaded (markDocumentUploaded): ready now, the links come with the silent refetch.
      if (response.linksPending === true) {
        return {
          state: "ready",
          preparing: true,
          gradeName,
          links: { transcript: null, transcriptView: null, diploma: null, diplomaView: null },
          showDiploma: diplomaGrade,
          heading: COPY.ready(gradeName),
          reasons: [],
        };
      }
      return HIDDEN;
    }
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
 * Scenarios: ready, docs, multi, g12, fail, hold, all (+ holdgeneric, notavailable, oldfee, e004). No fee scenarios: pending fees
 * are not a card reason any more (oldfee = a backend still sending FEE_PENDING -> NOT_AVAILABLE).
 * Upload is simulated in memory while the mock is on (no backend call), so a refetch shows the change.
 * ───────────────────────────────────────────────────────────────────────────────────────────────────────────── */

const MOCK_LINK = { viewPath: "/dashboard/student-transcript-view-after-publish/mock", downloadPath: "/dashboard/student-transcript-view-after-publish/mock?forDownload=true" };
const MOCK_DIPLOMA = { viewPath: "/dashboard/view-diploma/mock", downloadPath: "/dashboard/view-diploma/mock?forDownload=true" };
const mockDocs = (a, p, l) => ({
  code: BLOCKER_DOCUMENTS,
  items: ACADEMIC_DOCS.map((d, i) => ({ ...d, status: [a, p, l][i] })),
});
const M = DOC_STATUS_MISSING;
const U = DOC_STATUS_UPLOADED;

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
  const blockers = s.blockers.filter((b) => {
    if (b.code === BLOCKER_DOCUMENTS) return b.items.some((d) => d.status === DOC_STATUS_MISSING);
    return true;
  });
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

/** Mock upload: the document turns UPLOADED (uploaded = done). */
export async function mockUploadDocument(docType) {
  const s = mockScenario();
  if (!s) return false;
  await new Promise((resolve) => setTimeout(resolve, 700));
  s.blockers.forEach((b) => {
    if (b.code === BLOCKER_DOCUMENTS) b.items.forEach((d) => d.docType === docType && (d.status = DOC_STATUS_UPLOADED));
  });
  return true;
}
