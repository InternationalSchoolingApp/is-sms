"use client";

import Link from "next/link";
import { ArrowRight, CircleAlert, CirclePause, FileWarning, Hourglass, Lock, Paperclip } from "lucide-react";
import { BLOCKER_DOCUMENTS, BLOCKER_NOT_AVAILABLE, BLOCKER_ON_HOLD, BLOCKER_REJECTED, BLOCKER_UNDER_VERIFICATION, COPY } from "@/utils/reEnrollmentDocuments";

const ICON = {
  [BLOCKER_ON_HOLD]: CirclePause,
  [BLOCKER_DOCUMENTS]: Paperclip,
  [BLOCKER_REJECTED]: FileWarning,
  [BLOCKER_UNDER_VERIFICATION]: Hourglass,
  [BLOCKER_NOT_AVAILABLE]: CircleAlert,
};

// A reason the student can fix on the re-enrollment card (upload / re-upload a document); a school hold or a verification cannot be.
const fixable = (reason) => reason.code === BLOCKER_DOCUMENTS || reason.code === BLOCKER_REJECTED;

function RejectedLines({ docs }) {
  return docs.map((doc) => (
    <span key={doc.docType} className="block">
      • <b>{doc.label}</b>{" "}
      <span className="whitespace-nowrap rounded-full bg-red-50 px-2 py-px text-[11.5px] font-bold text-red-700">{COPY.docStatus.REJECTED}</span>
      <span className="block">
        <b>{COPY.rejectedReasonLabel}</b> {doc.reason || COPY.rejectedNoReason}
      </span>
    </span>
  ));
}

function ReasonText({ reason }) {
  if (reason.code === BLOCKER_ON_HOLD) {
    const { hold } = reason;
    return hold.reason ? (
      <>
        <b>{hold.title}</b>
        <span className="block">
          <b>{COPY.holdReason}</b> {hold.reason}
        </span>
        {hold.remark && (
          <span className="block">
            <b>{COPY.holdRemark}</b> {hold.remark}
          </span>
        )}
        <span className="block text-[13px] opacity-80">{hold.contact}</span>
      </>
    ) : (
      <>
        <b>{hold.title}</b> {hold.contact}
      </>
    );
  }
  if (reason.code === BLOCKER_DOCUMENTS) {
    return (
      <>
        {reason.missing.length > 0 && COPY.docsTitle}
        {reason.missing.map((doc) => (
          <span key={doc.docType} className="block">
            • <b>{doc.label}</b>{" "}
            <span className="whitespace-nowrap rounded-full bg-red-50 px-2 py-px text-[11.5px] font-bold text-red-700">{COPY.docStatus.MISSING}</span>
          </span>
        ))}
        {reason.rejected?.length > 0 && (
          <>
            <b className="block">{reason.missing.length > 0 || reason.rejected.length > 1 ? COPY.rejectedMany : COPY.rejectedOne}</b>
            <RejectedLines docs={reason.rejected} />
          </>
        )}
        <span className="block text-[13px] opacity-80">{COPY.docsHintElsewhere}</span>
      </>
    );
  }
  if (reason.code === BLOCKER_REJECTED) {
    return (
      <>
        <b>{reason.rejected.length === 1 ? COPY.rejectedOne : COPY.rejectedMany}</b>
        <RejectedLines docs={reason.rejected} />
        <span className="block text-[13px] opacity-80">{COPY.docsHintElsewhere}</span>
      </>
    );
  }
  if (reason.code === BLOCKER_UNDER_VERIFICATION) {
    return (
      <>
        <b>{COPY.underVerificationTitle}</b> {COPY.underVerificationText}
      </>
    );
  }
  return COPY.notAvailable;
}

/**
 * My Transcript (plan v3 Phase 4): a grade the backend marks `transcriptBlocked` shows why, with the same copy as the
 * re-enrollment card, instead of its View / Download links. Fixes live on the re-enrollment page: `fixHref` (only when the
 * student is re-enrollment-eligible) adds "Fix this on the re-enrollment page" when a reason can be fixed there.
 *
 * blocked: utils/transcriptLinks.blockedTranscripts(). look: "k5" (K5Transcript) or "classic" (Transcript).
 */
export function TranscriptBlockedNotice({ blocked, fixHref, look = "classic" }) {
  if (!blocked?.length) return null;
  const k5 = look === "k5";
  return (
    <div className="flex flex-col gap-3">
      {blocked.map((item) => {
        const headingId = `${item.key}-blocked`;
        return (
          <section
            key={item.key}
            aria-labelledby={headingId}
            className={`border border-amber-300 bg-amber-50 px-4 py-3 text-[14px] leading-[1.45] text-[#5b4410] ${k5 ? "rounded-[18px] font-k5-body font-semibold" : "rounded-xl"}`}
          >
            <h2 id={headingId} className={`m-0 flex items-center gap-2 text-[15px] font-bold text-[#3d2d07] ${k5 ? "font-k5-display" : ""}`}>
              <Lock className="h-4 w-4 flex-none text-amber-700" aria-hidden="true" />
              {COPY.blockedRow(item.label)}
            </h2>
            <ul className="m-0 mt-1.5 list-none p-0">
              {item.reasons.map((reason) => {
                const Icon = ICON[reason.code] ?? CircleAlert;
                return (
                  <li key={reason.code} className="flex items-start gap-2.5 border-b border-dashed border-amber-200 py-2 last:border-b-0">
                    <span className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-lg bg-white text-amber-700" aria-hidden="true">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1 [&_b]:font-bold [&_b]:text-[#3d2d07]">
                      <ReasonText reason={reason} />
                    </span>
                  </li>
                );
              })}
            </ul>
            {fixHref && item.reasons.some(fixable) && (
              <Link
                href={fixHref}
                className={`mt-1 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-semibold text-white no-underline ${k5 ? "bg-k5-ac hover:opacity-90" : "bg-primary hover:bg-primary/90"}`}
              >
                {COPY.fixOnReEnrollment}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            )}
          </section>
        );
      })}
    </div>
  );
}
