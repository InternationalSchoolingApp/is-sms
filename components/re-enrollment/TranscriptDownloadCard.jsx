"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { CircleAlert, CirclePause, Download, FileText, Loader2, Lock, MessageCircle, Paperclip, RefreshCw, Upload } from "lucide-react";
import { CHAT_BASE_URL } from "@/components/re-enrollment/ReEnrollmentParts";
import { DocumentUploadPanel } from "@/components/re-enrollment/DocumentUploadPanel";
import { useDummyStudent } from "@/hooks/useDummyStudent";
import { useModuleRights } from "@/hooks/useModuleRights";
import { reEnrollmentDocumentsKey, useReEnrollmentContext, useReEnrollmentDocuments } from "@/hooks/useReEnrollment";
import { expireSession } from "@/utils/logout";
import {
  BLOCKER_DOCUMENTS,
  DOC_STATUS_UPLOADED,
  BLOCKER_NOT_AVAILABLE,
  BLOCKER_ON_HOLD,
  COPY,
  demoReEnrollmentDocuments,
  isReEnrollmentDocsMock,
  mapReEnrollmentDocuments,
  markDocumentUploaded,
} from "@/utils/reEnrollmentDocuments";
import styles from "./K5PassedOptions.module.css";

const REASON_ICON = {
  [BLOCKER_ON_HOLD]: CirclePause,
  [BLOCKER_DOCUMENTS]: Paperclip,
  [BLOCKER_NOT_AVAILABLE]: CircleAlert,
};

function HoldReason({ hold, chatUrl }) {
  return (
    <>
      <span className={styles.trText}>
        <b>{hold.title}</b>
        {hold.reason ? (
          <>
            <span className={styles.trLine}>
              <b>{COPY.holdReason}</b> {hold.reason}
            </span>
            {hold.remark && (
              <span className={styles.trLine}>
                <b>{COPY.holdRemark}</b> {hold.remark}
              </span>
            )}
            <span className={`${styles.trLine} ${styles.trMuted}`}>{hold.contact}</span>
          </>
        ) : (
          <> {hold.contact}</>
        )}
      </span>
      {/* No fix on the card: only the school can release a hold. */}
      <a className={`${styles.trCta} ${styles.trCtaGhost}`} href={chatUrl} target="_blank" rel="noopener noreferrer">
        <MessageCircle size={14} aria-hidden="true" />
        {COPY.talkToUs}
      </a>
    </>
  );
}

function DocumentsReason({ reason, open, onToggle, panelId }) {
  return (
    <>
      <span className={styles.trText}>
        {COPY.docsTitle}
        {reason.missing.map((doc) => (
          <span key={doc.docType} className={styles.trLine}>
            • <b>{doc.label}</b> <span className={`${styles.trChip} ${styles.trChipMissing}`}>{COPY.docStatus.MISSING}</span>
          </span>
        ))}
        <span className={`${styles.trLine} ${styles.trMuted}`}>{COPY.docsHint}</span>
      </span>
      {reason.missing.length > 0 && (
        <button type="button" className={styles.trCta} onClick={onToggle} aria-expanded={open} aria-controls={panelId}>
          {!open && <Upload size={14} aria-hidden="true" />}
          {open ? COPY.hideUpload : COPY.upload}
        </button>
      )}
    </>
  );
}

/**
 * Re-enrollment option screen: "Download your transcript" card, after the option rows (plan v3).
 *   loading -> skeleton · ready -> Download (+ diploma for a Grade 12 PASS) · blocked -> disabled Download + every reason with
 *   its same-page fix (school hold: none; documents: inline upload) · hidden -> nothing. Pending fees are not shown here: the
 *   onboarding overdue-fee gate already handles them.
 * Hidden on E004 / error / old backend (404) / no "student-transcript" view right (also off when showTranscriptMenu is false:
 * the menu then drops the module). Session out -> expireSession. Dummy (demo) student -> a demo card, no API.
 *
 * look: "k5" (K5PassedOptions, the band's option-row look) or "classic" (ReEnrollmentOptions).
 */
export function TranscriptDownloadCard({ look = "classic" }) {
  const { session, eligibility } = useReEnrollmentContext();
  const rights = useModuleRights("student-transcript");
  const dummy = useDummyStudent();
  const titleId = useId();
  const reasonsId = useId();
  const panelId = useId();
  const [uploadOpen, setUploadOpen] = useState(false);
  // TEMP dev mock (utils/reEnrollmentDocuments.js): read once after mount, never on the server.
  const [mock] = useState(() => typeof window !== "undefined" && isReEnrollmentDocsMock());

  const live = dummy.settled && !dummy.enabled;
  const allowed = !rights.waiting && rights.canView;
  const query = useReEnrollmentDocuments({ schoolUUID: session?.schoolUUID, userId: session?.userId, enabled: live && (allowed || mock) });

  const view = useMemo(() => {
    if (dummy.enabled) return demoReEnrollmentDocuments(eligibility?.currentGrade?.name);
    // A failed background refetch keeps what is on the card (e.g. right after an upload); only "no answer at all" hides it.
    if (query.isError && !query.data) return { state: "hidden" };
    return mapReEnrollmentDocuments(query.data);
  }, [dummy.enabled, eligibility?.currentGrade?.name, query.isError, query.data]);

  // After an upload: the document turns "Uploaded" on the card at once; the documents API is refreshed in the background
  // (not awaited), and brings the links when nothing else blocks the transcript.
  const queryClient = useQueryClient();
  // The 3 documents as of the last upload (all Uploaded once the last one is in): the card turns ready and the documents
  // blocker is gone, but the student can still View what was uploaded from this list, under the ready row.
  const [docsAfterUpload, setDocsAfterUpload] = useState(null);
  const onUploaded = (docType) => {
    const docsReason = view.reasons?.find((reason) => reason.code === BLOCKER_DOCUMENTS);
    if (docsReason) {
      setDocsAfterUpload(docsReason.docs.map((doc) => (doc.docType === docType ? { ...doc, status: DOC_STATUS_UPLOADED } : doc)));
    }
    queryClient.setQueryData(reEnrollmentDocumentsKey(session?.userId), (old) => markDocumentUploaded(old, docType));
    query.refetch();
  };

  useEffect(() => {
    if (view.state === "session-out") expireSession(session?.schoolUUID);
  }, [view.state, session?.schoolUUID]);

  const loading = !dummy.settled || (!dummy.enabled && (mock ? query.isPending : rights.waiting || (allowed && query.isPending)));
  if (loading) {
    return <div className={styles.trSkeleton} role="status" aria-label={COPY.loading} />;
  }
  if (!dummy.enabled && !mock && !allowed) return null;
  if (view.state !== "ready" && view.state !== "blocked") return null;

  const chatUrl = `${CHAT_BASE_URL}/onboarding-support?uuid=${encodeURIComponent(session?.uniqueId || "")}`;
  const rowClass = look === "k5" ? styles.option : styles.trClassic;
  const tileClass = look === "k5" ? `${styles.tile} ${styles.trTile}` : `${styles.trTileClassic} ${styles.trTile}`;
  const buttonClass = look === "k5" ? styles.next : styles.trNextClassic;
  const titleClass = look === "k5" ? styles.optionTitle : styles.trTitleClassic;
  const copyClass = look === "k5" ? styles.optionCopy : styles.trCopyClassic;

  const onDemoClick = (event) => {
    if (!view.demo) return;
    event.preventDefault();
    toast(COPY.demoDownload);
  };

  const ready = view.state === "ready";
  const title = (
    <div className={titleClass}>
      <h3 id={titleId}>{COPY.title}</h3>
      <span className={styles.trNew}>{COPY.newBadge}</span>
    </div>
  );

  // One Download button; a Grade 12 PASS (diploma) gets two: Download Transcript + Download Diploma. Each opens the
  // document's page in a new tab. Blocked: disabled. Right after the last upload: disabled with a spinner until the links arrive.
  const docs = view.showDiploma
    ? [
        { key: "transcript", label: COPY.downloadTranscript, href: view.links?.transcriptView || view.links?.transcript, aria: COPY.downloadTranscript },
        { key: "diploma", label: COPY.downloadDiploma, href: view.links?.diplomaView || view.links?.diploma, aria: COPY.downloadDiploma },
      ]
    : [{ key: "transcript", label: COPY.download, href: view.links?.transcriptView || view.links?.transcript, aria: `${COPY.download}: ${COPY.title}` }];
  const docButtons = docs.map((doc) =>
    ready && !view.preparing ? (
      <a key={doc.key} className={buttonClass} href={doc.href} target="_blank" rel="noopener noreferrer" onClick={onDemoClick} aria-label={doc.aria}>
        {doc.label} <Download size={20} aria-hidden="true" />
      </a>
    ) : ready ? (
      <button key={doc.key} type="button" className={`${buttonClass} ${styles.trDisabled}`} aria-disabled="true" aria-busy="true">
        {docs.length === 1 ? COPY.preparing : doc.label} <Loader2 size={20} className="animate-spin" aria-hidden="true" />
      </button>
    ) : (
      <button
        key={doc.key}
        type="button"
        className={`${buttonClass} ${styles.trDisabled}`}
        aria-disabled="true"
        aria-describedby={reasonsId}
        title={COPY.downloadDisabledHint}
      >
        {doc.label} <Download size={20} aria-hidden="true" />
      </button>
    ),
  );

  return (
    <>
      <section
        className={`${rowClass} ${styles.trRow} ${ready ? styles.trReady : styles.trBlocked}`}
        aria-labelledby={titleId}
        aria-busy={query.isFetching || undefined}
      >
        <span className={tileClass} aria-hidden="true">
          {ready ? <FileText size={24} /> : <Lock size={24} />}
        </span>
        <div className={copyClass}>
          {title}
          <p>{view.heading}</p>
        </div>
        {docButtons.length > 1 ? <div className={styles.trButtons}>{docButtons}</div> : docButtons}
        {!ready && (
          <ul id={reasonsId} className={styles.trReasons} aria-label="Why the transcript is not available yet">
            {view.reasons.map((reason) => {
              const Icon = REASON_ICON[reason.code] ?? CircleAlert;
              return (
                <li key={reason.code}>
                  <span className={styles.trIcon} aria-hidden="true">
                    <Icon size={16} />
                  </span>
                  {reason.code === BLOCKER_ON_HOLD && <HoldReason hold={reason.hold} chatUrl={chatUrl} />}
                  {reason.code === BLOCKER_DOCUMENTS && (
                    <>
                      <DocumentsReason reason={reason} open={uploadOpen} onToggle={() => setUploadOpen((v) => !v)} panelId={panelId} />
                      {uploadOpen && reason.docs.length > 0 && (
                        <DocumentUploadPanel id={panelId} docs={reason.docs} onUploaded={onUploaded} schoolUUID={session?.schoolUUID} userId={session?.userId} mock={mock} />
                      )}
                    </>
                  )}
                  {reason.code === BLOCKER_NOT_AVAILABLE && (
                    <>
                      <span className={styles.trText}>{COPY.notAvailable}</span>
                      <button type="button" className={`${styles.trCta} ${styles.trCtaGhost}`} onClick={() => query.refetch()} disabled={query.isFetching}>
                        <RefreshCw size={14} aria-hidden="true" />
                        {COPY.tryAgain}
                      </button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {ready && docsAfterUpload && (
          <DocumentUploadPanel docs={docsAfterUpload} schoolUUID={session?.schoolUUID} userId={session?.userId} mock={mock} />
        )}
      </section>
    </>
  );
}
