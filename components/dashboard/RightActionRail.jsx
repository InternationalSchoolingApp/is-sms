"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
export function RightActionRail({ chatUrl, diaryUrl, schoolUUID, userId, schoolName }) {
  const queryClient = useQueryClient();
  const [announcementsOpen, setAnnouncementsOpen] = useState(false);
  const [newsOpen, setNewsOpen] = useState(false);
  const [diaryOpen, setDiaryOpen] = useState(false);
  // window.location.origin differs server/client, so the bridge iframe
  // (which needs it in its query string) only ever renders after mount —
  // matches server markup on first paint and avoids a hydration mismatch.
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setOrigin(window.location.origin), 0);
    return () => clearTimeout(id);
  }, []);

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

  // Belt-and-suspenders refresh around a diary visit, on top of the
  // postMessage push below — covers the moment between opening the panel
  // and the bridge iframe actually connecting/posting.
  const refreshDiaryBadge = () => {
    queryClient.invalidateQueries({ queryKey: ["diary-unread-count", userId] });
    queryClient.invalidateQueries({ queryKey: ["diary-threads", userId] });
  };

  // Legacy's diaryBridgeEnsureConnected(): a hidden iframe at the diary
  // host's /iframe/diary-bridge, which posts {type: "DAIRY_COUNT_CHANGED",
  // userId} (the "DAIRY" typo is the wire contract, not ours to fix) whenever
  // the student's unread diary count changes server-side — real-time push
  // instead of polling. DIARY_URL is pre-resolved server-side (falls back to
  // CHAT_URL when unset), so no client-side host fallback is needed here.
  useEffect(() => {
    if (!diaryUrl || !userId) return;
    let bridgeOrigin;
    try {
      bridgeOrigin = new URL(diaryUrl).origin;
    } catch {
      return;
    }
    const onMessage = (event) => {
      if (event.origin !== bridgeOrigin) return;
      const msg = event.data;
      if (!msg || typeof msg !== "object") return;
      if (msg.type === "DAIRY_COUNT_CHANGED" && String(msg.userId) === String(userId)) {
        refreshDiaryBadge();
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diaryUrl, userId]);

  const openTalkToUs = () => {
    if (chatUrl) window.open(chatUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      {diaryUrl && origin && (
        <iframe
          src={`${diaryUrl}/iframe/diary-bridge?userId=${encodeURIComponent(userId)}&origin=${encodeURIComponent(origin)}`}
          title="diary-bridge"
          aria-hidden="true"
          style={{ display: "none" }}
        />
      )}

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
        <RailButton
          label="Student Diary"
          onClick={() => {
            setDiaryOpen(true);
            refreshDiaryBadge();
          }}
          badge={unreadDiaryMessages}
        >
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

      {diaryOpen && (
        <DiaryPanel
          sessionUserId={userId}
          schoolName={schoolName}
          onClose={() => {
            setDiaryOpen(false);
            refreshDiaryBadge();
          }}
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
