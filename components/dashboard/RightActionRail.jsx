"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle, Megaphone, Newspaper, NotebookText } from "lucide-react";
import { getAnnouncementDetails } from "@/services/dashboardApi";
import { getAllArticles } from "@/services/newsApi";
import { getDiaryUnreadCount } from "@/services/diaryApi";
import { AnnouncementsPanel } from "@/components/dashboard/AnnouncementsPanel";
import { NewsPanel } from "@/components/dashboard/NewsPanel";
import { DiaryPanel } from "@/components/dashboard/DiaryPanel";

/**
 * Fixed right-edge floating action rail — mirrors the legacy student dashboard:
 * Talk to Us (chat), Announcement, News, Student Diary. All four are wired to
 * real backend data and open their own slide-in panel. Talk to Us opens
 * `chatUrl` directly instead of a panel.
 */
export function RightActionRail({ chatUrl, schoolUUID, userId, schoolName }) {
  const [announcementsOpen, setAnnouncementsOpen] = useState(false);
  const [newsOpen, setNewsOpen] = useState(false);
  const [diaryOpen, setDiaryOpen] = useState(false);

  const announcementsQuery = useQuery({
    queryKey: ["student-announcements", schoolUUID, userId],
    queryFn: () => getAnnouncementDetails({ schoolUUID, userId, startFrom: 0, pageSize: 20 }),
    enabled: Boolean(schoolUUID && userId),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
  const announcements = announcementsQuery.data?.announcements || [];
  const newAnnouncementCount = announcementsQuery.data?.newAnnouncementCount || 0;

  const newsQuery = useQuery({
    queryKey: ["news-articles"],
    queryFn: () => getAllArticles({ page: 1, size: 10 }),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
  const articles = newsQuery.data?.list || [];
  const totalNews = newsQuery.data?.totalNews || 0;

  const diaryCountQuery = useQuery({
    queryKey: ["diary-unread-count", userId],
    queryFn: () => getDiaryUnreadCount({ sessionUserId: userId }),
    enabled: Boolean(userId),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const unreadDiaryMessages = diaryCountQuery.data?.details?.unreadMessageCount || 0;

  const openTalkToUs = () => {
    if (chatUrl) window.open(chatUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <div className="fixed right-0 top-1/4 z-40 flex -translate-y-1/2 flex-col items-center gap-3 pr-2">
        <RailButton label="Talk to Us" onClick={openTalkToUs} className="bg-green-600 hover:bg-green-700">
          <MessageCircle className="h-5 w-5" />
        </RailButton>
        <RailButton label="Announcement" onClick={() => setAnnouncementsOpen(true)} badge={newAnnouncementCount}>
          <Megaphone className="h-5 w-5" />
        </RailButton>
        <RailButton label="News" onClick={() => setNewsOpen(true)} badge={totalNews}>
          <Newspaper className="h-5 w-5" />
        </RailButton>
        <RailButton label="Student Diary" onClick={() => setDiaryOpen(true)} badge={unreadDiaryMessages}>
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

      {newsOpen && <NewsPanel articles={articles} totalNews={totalNews} userId={userId} onClose={() => setNewsOpen(false)} />}

      {diaryOpen && <DiaryPanel sessionUserId={userId} schoolName={schoolName} onClose={() => setDiaryOpen(false)} />}
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
