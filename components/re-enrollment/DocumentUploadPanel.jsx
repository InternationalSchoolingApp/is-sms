"use client";

import { useId, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Download, Eye, Loader2, Paperclip, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useProfileActions } from "@/hooks/useProfileActions";
import { useStudentProfile } from "@/hooks/useStudentProfile";
import { COPY, DOC_STATUS_REJECTED, DOC_STATUS_VERIFIED, isDocumentIn, mockUploadDocument } from "@/utils/reEnrollmentDocuments";
import styles from "./K5PassedOptions.module.css";

// The profile's document key (utils/profileModel.js DOCS) of each docType: where the uploaded file's URL comes from,
// the same data My Profile > Documents shows its View button from.
const PROFILE_DOC_KEY = { "Age Proof": "ageProof", Signature: "parentPassportProof", "Last Academic Proof": "lastAcademicProof" };
// TEMP dev mock: a picture to preview (no backend file exists).
const MOCK_PREVIEW = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="300"><rect width="480" height="300" fill="#eef2f8"/><text x="240" y="155" font-family="sans-serif" font-size="22" text-anchor="middle" fill="#536079">Mock document preview</text></svg>',
)}`;
// Same rule as K5ProfileDocs.jsx isPdf().
const isPdf = (doc) => doc.type === "P" || /\.pdf($|\?)/i.test(doc.url || doc.name || "");

// Same checks and messages as My Profile > Documents (K5ProfileDocs.jsx choose(), app/api/profile/document/route.js).
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,application/pdf";
const ACCEPTED_TYPES = ACCEPT.split(",");
const TOO_BIG = "Please upload files in PDF, JPG, PNG, and JPEG with max size of 5MB";
const BAD_TYPE = "Please upload files in PDF, JPG, PNG, and JPEG Format";

function validate(file) {
  if (!file) return "Please choose a file.";
  if (file.size > MAX_BYTES) return TOO_BIG;
  if (!ACCEPTED_TYPES.includes(file.type)) return BAD_TYPE;
  return "";
}

// The picture of a preview: a large file takes a while from storage, so a loading line shows until it is there.
function PreviewImage({ doc }) {
  const [state, setState] = useState("loading");
  return (
    <>
      {state === "loading" && (
        <p className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500" role="status">
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          {COPY.loadingPreview}
        </p>
      )}
      {state === "failed" && (
        <p className="py-10 text-center text-sm text-red-600" role="alert">
          {COPY.previewFailed}
        </p>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element -- an uploaded proof (S3) of any size, previewed as it is */}
      <img
        src={doc.url}
        alt={doc.label || "Document"}
        onLoad={() => setState("ready")}
        onError={() => setState("failed")}
        className={`mx-auto h-auto max-h-[70dvh] w-auto max-w-full flex-none rounded-lg object-contain ${state === "ready" ? "block" : "hidden"}`}
      />
    </>
  );
}

// The preview of an uploaded file: the picture, or the PDF with a Download PDF link (the existing page's "Preview File").
function PreviewDialog({ doc, onClose }) {
  return (
    <Dialog open={Boolean(doc)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[calc(100dvh-32px)] flex-col overflow-hidden sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>
            {COPY.previewTitle}
            {doc?.name ? ` · ${doc.name}` : ""}
          </DialogTitle>
        </DialogHeader>
        {doc && (
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto">
            {doc.pdf ? (
              <>
                <a
                  href={doc.url}
                  download={doc.name || "document.pdf"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-9 items-center gap-2 self-end rounded-lg bg-primary px-3 text-sm font-semibold text-white no-underline"
                >
                  <Download size={16} aria-hidden="true" />
                  {COPY.downloadPdf}
                </a>
                <iframe src={doc.url} title={doc.name || "PDF document"} className="h-[65dvh] w-full flex-none rounded-lg border border-slate-200 bg-white" />
              </>
            ) : (
              <PreviewImage key={doc.url} doc={doc} />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DocRow({ doc, busy, disabled, onUpload, view, onView }) {
  // Uploaded or verified: View only. Missing or "not verified": choose a file and upload (again).
  const uploaded = isDocumentIn(doc);
  const rejected = doc.status === DOC_STATUS_REJECTED;
  const inputRef = useRef(null);
  const errorId = useId();
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");

  const pick = (event) => {
    const chosen = event.target.files?.[0] ?? null;
    // Let the same file be chosen again after an error.
    event.target.value = "";
    if (!chosen) return;
    const problem = validate(chosen);
    if (problem) {
      setFile(null);
      setError(problem);
      toast.error(problem);
      return;
    }
    setError("");
    setFile(chosen);
  };

  const upload = async () => {
    if (!file || busy || disabled) return;
    const ok = await onUpload(doc.docType, file);
    if (ok) setFile(null);
    else setError("The document could not be uploaded. Please try again.");
  };

  return (
    <div className={styles.trDoc}>
      <div className={styles.trDocName}>
        <b>{doc.label}</b>
        {rejected && (
          <span className={styles.trDocError} role="alert">
            {COPY.rejectedReasonLabel} {doc.reason || COPY.rejectedNoReason}
          </span>
        )}
        {error && (
          <span id={errorId} className={styles.trDocError} role="alert">
            {error}
          </span>
        )}
      </div>
      <span
        className={`${styles.trChip} ${uploaded ? styles.trChipUploaded : styles.trChipMissing}`}
        role={uploaded ? "status" : undefined}
      >
        {COPY.docStatus[doc.status] ?? COPY.docStatus.MISSING}
      </span>
      <div className={styles.trDocActions}>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className={styles.trFileInput}
          onChange={pick}
          tabIndex={-1}
          aria-hidden="true"
        />
        {uploaded ? (
          // View of the uploaded file (needs its URL from the profile data: ready), a moment of loading, or nothing when no URL exists.
          view.state === "ready" ? (
            <button
              type="button"
              className={`${styles.trCta} ${styles.trCtaGhost}`}
              onClick={() => onView(view.doc)}
              aria-label={`${COPY.viewDocument}: ${doc.label}`}
            >
              <Eye size={14} aria-hidden="true" />
              {COPY.viewDocument}
            </button>
          ) : view.state === "loading" ? (
            <span className={styles.trMuted} role="status">
              <Loader2 size={13} className="mr-1 inline animate-spin" aria-hidden="true" />
              {COPY.loadingView}
            </span>
          ) : null
        ) : busy ? (
          <span className={styles.trMuted} role="status">{COPY.uploading}</span>
        ) : (
          <>
            {file && (
              <span className={styles.trFileName}>
                <Paperclip size={13} aria-hidden="true" />
                {file.name}
              </span>
            )}
            <button
              type="button"
              className={`${styles.trCta} ${styles.trCtaGhost}`}
              onClick={() => inputRef.current?.click()}
              disabled={disabled}
              aria-label={`${file ? COPY.changeFile : COPY.chooseFile}: ${doc.label}`}
              aria-describedby={error ? errorId : undefined}
            >
              {file ? COPY.changeFile : COPY.chooseFile}
            </button>
            {file && (
              <button type="button" className={styles.trCta} onClick={upload} disabled={disabled} aria-label={`${COPY.upload}: ${doc.label}`}>
                <Upload size={14} aria-hidden="true" />
                {COPY.upload}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Inline upload of the missing mandatory documents (plan v3 Phase 2), inside the transcript card — no redirect to the
 * profile. Reuses the profile upload as it is: useProfileActions().uploadDocument -> POST /api/profile/document ->
 * BE dashboard/save-docs (one document per request), which writes the ATTACHMENTS row the documents check reads.
 * Uploaded = done, and shown at once: no refetch is awaited here — onUploaded(docType) (the card) flips the document to
 * "Uploaded" in place straight away and refreshes the documents in the background.
 *
 * An uploaded document has a View button (the picture / PDF in a preview dialog, like My Profile > Documents). The file's URL
 * comes from the profile data (useStudentProfile), refreshed after every upload; "Loading…" shows for that moment.
 *
 * docs: [{ label, docType, status, reason }] — the 3 mandatory documents (MISSING / UPLOADED / VERIFIED / REJECTED, the last
 * with the admin's reason: it is uploaded again here). onUploaded(docType): called after a
 * successful upload. schoolUUID / userId: for the profile data (the URLs). mock: TEMP dev mock on (no backend call).
 */
export function DocumentUploadPanel({ id, docs, onUploaded, schoolUUID, userId, mock = false }) {
  // No refetch here: awaiting it is what made the card wait for the documents API after every upload.
  const actions = useProfileActions({});
  const profile = useStudentProfile({ schoolUUID, userId });
  const [refreshing, setRefreshing] = useState(false);
  const [preview, setPreview] = useState(null);
  const [mockBusy, setMockBusy] = useState(null);

  async function onUpload(docType, file) {
    let ok;
    if (!mock) {
      ok = await actions.uploadDocument(docType, file);
    } else {
      // TEMP dev mock: same toast as the real upload, no backend call.
      setMockBusy(`doc:${docType}`);
      try {
        await mockUploadDocument(docType);
        toast.success("Document saved!");
        ok = true;
      } finally {
        setMockBusy(null);
      }
    }
    if (ok) {
      onUploaded?.(docType);
      // The new file's URL: the profile data is read again (in the background); its View button shows when it is there.
      if (!mock) {
        setRefreshing(true);
        Promise.resolve(profile.refetch())
          .catch(() => {})
          .finally(() => setRefreshing(false));
      }
    }
    return ok;
  }

  // View state of a document: ready (its URL is known), loading (the profile data is on its way), none (no URL to show).
  function viewOf(doc) {
    if (mock) return { state: "ready", doc: { url: MOCK_PREVIEW, name: `${doc.label}.svg`, label: doc.label, pdf: false } };
    const found = profile.model?.academic?.documents?.find((d) => d.key === PROFILE_DOC_KEY[doc.docType]);
    if (found?.url) return { state: "ready", doc: { url: found.url, name: found.name || doc.label, label: doc.label, pdf: isPdf(found) } };
    if (profile.isLoading || refreshing) return { state: "loading" };
    return { state: "none" };
  }

  const busy = mock ? mockBusy : actions.busy;
  const allDone = docs.length > 0 && docs.every(isDocumentIn);
  return (
    <div id={id} className={styles.trUpload} role="group" aria-label={allDone ? COPY.docsDoneTitle : COPY.uploadPanelTitle}>
      <div className={styles.trUploadHead}>
        {allDone ? (
          COPY.docsDoneTitle
        ) : (
          <>
            {COPY.uploadPanelTitle} <small>{COPY.uploadPanelSubtitle}</small>
          </>
        )}
      </div>
      <PreviewDialog doc={preview} onClose={() => setPreview(null)} />
      {docs.map((doc) => (
        <DocRow key={doc.docType} doc={doc} busy={busy === `doc:${doc.docType}`} disabled={Boolean(busy)} onUpload={onUpload} view={viewOf(doc)} onView={setPreview} />
      ))}
      {!allDone && <p className={styles.trNote}>{COPY.uploadPanelNote}</p>}
    </div>
  );
}
