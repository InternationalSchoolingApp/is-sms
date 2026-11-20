"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { CalendarDays, CheckCircle2, Eye, Megaphone, X } from "lucide-react";
import DOMPurify from "dompurify";
import { useTranslations } from "next-intl";
import { useDateFnsLocale } from "@/i18n/dateLocale";
import { submitAnnouncementAcknowledge } from "@/services/dashboardApi";
import { useDummyStudent } from "@/hooks/useDummyStudent";
import { getAttachmentUrl, isImageAttachment } from "@/utils/announcementAttachment";
import { AttachmentPreviewDialog } from "@/components/dashboard/AttachmentPreviewDialog";

// `locale` (optional): a date-fns locale (useDateFnsLocale()) for the month name.
export function formatAnnouncementDate(value, { locale } = {}) {
  if (!value) return "";
  // Backend sends "yyyy-MM-dd HH:mm:ss.S" — swap the space for "T" so it parses.
  const iso = String(value).replace(" ", "T");
  const parsed = parseISO(iso);
  return Number.isNaN(parsed.getTime()) ? "" : format(parsed, "MMM d, yyyy", locale && typeof locale === "object" ? { locale } : undefined);
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
  const dummy = useDummyStudent();
  const t = useTranslations("news");
  const tc = useTranslations("common");
  const dateLocale = useDateFnsLocale();
  const [acknowledged, setAcknowledged] = useState(announcement.replyStatus === "Y");
  const [acknowledging, setAcknowledging] = useState(false);
  // "Thanks for Acknowledgement" stays on screen for 5 seconds after an acknowledge goes through.
  const [thanks, setThanks] = useState(false);
  useEffect(() => {
    if (!thanks) return undefined;
    const id = setTimeout(() => setThanks(false), 5000);
    return () => clearTimeout(id);
  }, [thanks]);
  const attachmentUrl = getAttachmentUrl(announcement.attachment);
  // Like the legacy page: a picture opens in a preview dialog on this tab, any other file (PDF...) in a new tab.
  const [previewOpen, setPreviewOpen] = useState(false);
  const isImage = isImageAttachment(announcement.attachment);

  const handleAcknowledge = async () => {
    setAcknowledging(true);
    // Dummy-mode announcements don't exist server-side: legacy acknowledges them locally only.
    const result = dummy.enabled
      ? { status: "1" }
      : await submitAnnouncementAcknowledge({ schoolUUID, announceId: announcement.announcementId, userId });
    setAcknowledging(false);
    if (result?.status !== "1" && result?.status !== 1) return;

    setAcknowledged(true);
    setThanks(true);
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
            aria-label={tc("actions.close")}
            className="ml-auto flex h-7 w-7 flex-shrink-0 items-center justify-center rounded bg-red-600 text-white hover:bg-red-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 bg-primary/90 px-4 py-2 text-white">
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
          <span className="text-xs">{t("announcements.startDate")}</span>
          <span className="ml-auto text-sm font-bold">{formatAnnouncementDate(announcement.createdDate, { locale: dateLocale })}</span>
        </div>

        <div
          className="max-h-[45vh] overflow-y-auto px-5 py-4 text-sm leading-relaxed text-black [&_a]:text-primary [&_a]:underline [&_strong]:font-bold [&_ul]:list-disc [&_ul]:pl-5"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(announcement.teacherRemarks || "") }}
        />

        {thanks && (
          <div role="status" aria-live="polite" className="flex items-center justify-center gap-2 border-t border-emerald-100 bg-emerald-50 px-5 py-2.5 text-sm font-bold text-emerald-700">
            <CheckCircle2 className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
            {t("announcements.thanks")}
          </div>
        )}

        {(attachmentUrl || !acknowledged) && (
          <div className="flex gap-2 border-t border-slate-100 px-5 py-4">
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
                className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:opacity-90"
              >
                <Eye className="h-4 w-4" /> {t("announcements.viewAttachment")}
              </a>
            )}
            {!acknowledged && (
              <button
                type="button"
                onClick={handleAcknowledge}
                disabled={acknowledging}
                className="flex-1 rounded-lg border-2 border-emerald-600 px-4 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
              >
                {acknowledging ? t("announcements.submitting") : t("announcements.acknowledge")}
              </button>
            )}
          </div>
        )}
      </div>
      {previewOpen && <AttachmentPreviewDialog url={attachmentUrl} onClose={() => setPreviewOpen(false)} />}
    </div>
  );
}
