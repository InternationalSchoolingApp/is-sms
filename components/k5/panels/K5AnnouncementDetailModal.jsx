"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Eye, Megaphone, X } from "lucide-react";
import DOMPurify from "dompurify";
import { submitAnnouncementAcknowledge } from "@/services/dashboardApi";
import { useDummyStudent } from "@/hooks/useDummyStudent";
import { getAttachmentUrl, isImageAttachment } from "@/utils/announcementAttachment";
import { AttachmentPreviewDialog } from "@/components/dashboard/AttachmentPreviewDialog";
import { formatAnnouncementDate } from "@/components/dashboard/AnnouncementDetailModal";

export function K5AnnouncementDetailModal({ announcement, schoolUUID, userId, onClose }) {
  const queryClient = useQueryClient();
  const dummy = useDummyStudent();
  const [acknowledged, setAcknowledged] = useState(announcement.replyStatus === "Y");
  const [acknowledging, setAcknowledging] = useState(false);
  const attachmentUrl = getAttachmentUrl(announcement.attachment);
  // A picture opens in a preview dialog on this tab, any other file (PDF...) in a new tab (as in the legacy page).
  const [previewOpen, setPreviewOpen] = useState(false);
  const isImage = isImageAttachment(announcement.attachment);

  const handleAcknowledge = async () => {
    setAcknowledging(true);
    const result = dummy.enabled
      ? { status: "1" }
      : await submitAnnouncementAcknowledge({ schoolUUID, announceId: announcement.announcementId, userId });
    setAcknowledging(false);
    if (result?.status !== "1" && result?.status !== 1) return;

    setAcknowledged(true);
    queryClient.setQueriesData({ queryKey: ["student-announcements", schoolUUID, userId] }, (data) => {
      if (!data) return data;
      return {
        ...data,
        newAnnouncementCount: Math.max(0, (data.newAnnouncementCount || 0) - 1),
        announcements: (data.announcements || []).map((item) =>
          item.announcementId === announcement.announcementId ? { ...item, replyStatus: "Y", seenStatus: "Y" } : item
        ),
      };
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex w-full max-w-[440px] flex-col overflow-hidden rounded-[26px] border-[3px] border-k5-ink bg-k5-card shadow-[0_6px_0_var(--k5-ink)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 bg-k5-ac px-5 py-3.5">
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-white/20">
            <Megaphone className="h-6 w-6 text-white" aria-hidden="true" />
          </span>
          <h2 className="m-0 min-w-0 flex-1 truncate font-k5-display text-lg font-semibold text-white">{announcement.announceTitle}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-xl border-none bg-k5-red text-white shadow-[0_3px_0_#B91C1C]"
          >
            <X className="h-5 w-5" strokeWidth={3} />
          </button>
        </div>

        {/* Date pill */}
        <div className="flex items-center gap-2 bg-k5-act px-5 py-2.5">
          <CalendarDays className="h-5 w-5 text-k5-acx" aria-hidden="true" />
          <span className="font-k5-display text-sm font-semibold text-k5-acx">Start Date</span>
          <span className="ms-auto font-k5-display text-[15px] font-bold text-k5-ink">{formatAnnouncementDate(announcement.createdDate)}</span>
        </div>

        {/* Body */}
        <div
          className="max-h-[45vh] overflow-y-auto px-5 py-4 text-[15px] font-extrabold leading-relaxed text-k5-ink [&_a]:text-k5-acx [&_a]:underline [&_strong]:font-black [&_ul]:list-disc [&_ul]:pl-5"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(announcement.teacherRemarks || "") }}
        />

        {/* Actions */}
        {(attachmentUrl || !acknowledged) && (
          <div className="flex gap-3 border-t-[3px] border-k5-line px-5 py-4">
            {attachmentUrl && (
              <a
                href={attachmentUrl}
                {...(isImage
                  ? {
                      onClick: (e) => {
                        e.preventDefault();
                        setPreviewOpen(true);
                      },
                    }
                  : { target: "_blank", rel: "noopener noreferrer" })}
                className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-full border-none bg-k5-ac px-4 py-3 font-k5-display text-[15px] font-semibold text-white no-underline shadow-[0_4px_0_var(--k5-acd)]"
              >
                <Eye className="h-5 w-5" /> View Attachment
              </a>
            )}
            {!acknowledged && (
              <button
                type="button"
                onClick={handleAcknowledge}
                disabled={acknowledging}
                className="flex-1 cursor-pointer rounded-full border-[3px] border-k5-ac bg-k5-card px-4 py-3 font-k5-display text-[15px] font-semibold text-k5-acx disabled:opacity-50"
              >
                {acknowledging ? "Submitting…" : "Kindly Acknowledge"}
              </button>
            )}
          </div>
        )}
      </div>
      {previewOpen && <AttachmentPreviewDialog url={attachmentUrl} onClose={() => setPreviewOpen(false)} k5 />}
    </div>
  );
}
