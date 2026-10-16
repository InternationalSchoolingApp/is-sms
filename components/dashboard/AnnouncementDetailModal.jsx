"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { CalendarDays, Eye, Megaphone, X } from "lucide-react";
import DOMPurify from "dompurify";
import { submitAnnouncementAcknowledge } from "@/services/dashboardApi";
import { getAttachmentUrl } from "@/utils/announcementAttachment";

export function formatAnnouncementDate(value) {
  if (!value) return "";
  // Backend sends "yyyy-MM-dd HH:mm:ss.S" — swap the space for "T" so it parses.
  const iso = String(value).replace(" ", "T");
  const parsed = parseISO(iso);
  return Number.isNaN(parsed.getTime()) ? "" : format(parsed, "MMM d, yyyy");
}

/**
 * Full announcement detail — legacy announcementModalContent: a blue header
 * bar (title + close), a "Start Date" pill, the sanitized rich-text body,
 * and View Attachment / Kindly Acknowledge actions. Shared by the home-page
 * AnnouncementsWidget and the rail's AnnouncementsPanel.
 *
 * Acknowledge updates the shared `student-announcements` react-query cache
 * directly (matching the legacy JS's optimistic local DOM update — it never
 * re-fetches the list) so both consumers' unread badges/New tags stay in
 * sync without an extra round-trip.
 */
export function AnnouncementDetailModal({ announcement, schoolUUID, userId, onClose }) {
  const queryClient = useQueryClient();
  const [acknowledged, setAcknowledged] = useState(announcement.replyStatus === "Y");
  const [acknowledging, setAcknowledging] = useState(false);
  const attachmentUrl = getAttachmentUrl(announcement.attachment);

  const handleAcknowledge = async () => {
    setAcknowledging(true);
    const result = await submitAnnouncementAcknowledge({ schoolUUID, announceId: announcement.announcementId, userId });
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 bg-primary px-4 py-3">
          <Megaphone className="h-5 w-5 flex-shrink-0 text-white" aria-hidden="true" />
          <h2 className="truncate text-sm font-extrabold text-white">{announcement.announceTitle}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ml-auto flex h-7 w-7 flex-shrink-0 items-center justify-center rounded bg-red-600 text-white hover:bg-red-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 bg-primary/90 px-4 py-2 text-white">
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
          <span className="text-xs">Start Date</span>
          <span className="ml-auto text-sm font-bold">{formatAnnouncementDate(announcement.createdDate)}</span>
        </div>

        <div
          className="max-h-[45vh] overflow-y-auto px-5 py-4 text-sm leading-relaxed text-black [&_a]:text-primary [&_a]:underline [&_strong]:font-bold [&_ul]:list-disc [&_ul]:pl-5"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(announcement.teacherRemarks || "") }}
        />

        {(attachmentUrl || !acknowledged) && (
          <div className="flex gap-2 border-t border-slate-100 px-5 py-4">
            {attachmentUrl && (
              <a
                href={attachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:opacity-90"
              >
                <Eye className="h-4 w-4" /> View Attachment
              </a>
            )}
            {!acknowledged && (
              <button
                type="button"
                onClick={handleAcknowledge}
                disabled={acknowledging}
                className="flex-1 rounded-lg border-2 border-emerald-600 px-4 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
              >
                {acknowledging ? "Submitting…" : "Kindly Acknowledge"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
