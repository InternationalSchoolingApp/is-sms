"use client";

import { format, parseISO } from "date-fns";
import DOMPurify from "dompurify";
import { CalendarModal } from "@/components/dashboard/calendar/CalendarModal";

export function formatAnnouncementDate(value) {
  if (!value) return "";
  // Backend sends "yyyy-MM-dd HH:mm:ss.S" — swap the space for "T" so it parses.
  const iso = String(value).replace(" ", "T");
  const parsed = parseISO(iso);
  return Number.isNaN(parsed.getTime()) ? "" : format(parsed, "MMM d, yyyy");
}

/**
 * Full announcement body (sanitized rich-text `teacherRemarks`). Shared by
 * the home-page AnnouncementsWidget and the rail's AnnouncementsPanel.
 */
export function AnnouncementDetailModal({ announcement, onClose }) {
  return (
    <CalendarModal title={announcement.announceTitle} onClose={onClose}>
      <p className="mb-2 text-xs text-black/50">{formatAnnouncementDate(announcement.createdDate)}</p>
      <div
        className="max-h-[50vh] overflow-y-auto text-sm leading-relaxed text-black [&_a]:text-primary [&_a]:underline [&_strong]:font-bold [&_ul]:list-disc [&_ul]:pl-5"
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(announcement.teacherRemarks || "") }}
      />
    </CalendarModal>
  );
}
