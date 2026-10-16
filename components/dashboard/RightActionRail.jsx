"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle, Megaphone, Newspaper, NotebookText } from "lucide-react";
import toast from "react-hot-toast";
import { getAnnouncementDetails } from "@/services/dashboardApi";
import { AnnouncementsPanel } from "@/components/dashboard/AnnouncementsPanel";

/**
 * Fixed right-edge floating action rail — mirrors the legacy student dashboard:
 * Talk to Us (chat), Announcement, News, Student Diary.
 *
 * Announcement is wired to the real getAnnouncementDetails endpoint (same
 * data the home-page AnnouncementsWidget uses) and opens the legacy-style
 * slide-in panel. Talk to Us opens `chatUrl` when known. The rest are
 * data/integration-driven in the legacy app and stay "coming soon" toasts
 * until their backing data/links are threaded through the dashboard context.
 */
export function RightActionRail({ chatUrl, schoolUUID, userId, newsCount }) {
  const [announcementsOpen, setAnnouncementsOpen] = useState(false);
  const announcementsQuery = useQuery({
    queryKey: ["student-announcements", schoolUUID, userId],
    queryFn: () => getAnnouncementDetails({ schoolUUID, userId, startFrom: 0, pageSize: 20 }),
    enabled: Boolean(schoolUUID && userId),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
  const announcements = announcementsQuery.data?.announcements || [];
  const newAnnouncementCount = announcementsQuery.data?.newAnnouncementCount || 0;

  const soon = (label) => () => {
    if (label === "Talk to Us" && chatUrl) {
      window.open(chatUrl, "_blank", "noopener,noreferrer");
      return;
    }
    toast(`${label} — coming soon`, { icon: "🚧" });
  };

  return (
    <>
      <div className="fixed right-0 top-1/4 z-40 flex -translate-y-1/2 flex-col items-center gap-3 pr-2">
        <RailButton label="Talk to Us" onClick={soon("Talk to Us")} className="bg-green-600 hover:bg-green-700">
          <MessageCircle className="h-5 w-5" />
        </RailButton>
        <RailButton label="Announcement" onClick={() => setAnnouncementsOpen(true)} badge={newAnnouncementCount}>
          <Megaphone className="h-5 w-5" />
        </RailButton>
        <RailButton label="News" onClick={soon("News")} badge={newsCount}>
          <Newspaper className="h-5 w-5" />
        </RailButton>
        <RailButton label="Student Diary" onClick={soon("Student Diary")}>
          <NotebookText className="h-5 w-5" />
        </RailButton>
      </div>

      {announcementsOpen && (
        <AnnouncementsPanel
          announcements={announcements}
          newCount={newAnnouncementCount}
          schoolUUID={schoolUUID}
          userId={userId}
          onClose={() => setAnnouncementsOpen(false)}
        />
      )}
    </>
  );
}

function RailButton({ label, onClick, badge, className = "bg-primary hover:opacity-90", children }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`relative flex h-11 w-11 items-center justify-center rounded-full text-white shadow-md transition ${className}`}
    >
      {children}
      {badge ? (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white">
          {badge}
        </span>
      ) : null}
    </button>
  );
}
