"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Megaphone, Newspaper, NotebookText } from "lucide-react";
import { getAnnouncementDetails, getChatUnseenCount } from "@/services/dashboardApi";
import { getAllArticles } from "@/services/newsApi";
import { getDiaryUnreadCount } from "@/services/diaryApi";
import { useDummyStudent } from "@/hooks/useDummyStudent";
import { buildChatSignInUrl } from "@/utils/chatLink";
import { AnnouncementsPanel } from "@/components/dashboard/AnnouncementsPanel";
import { NewsPanel } from "@/components/dashboard/NewsPanel";
import { DiaryPanel } from "@/components/dashboard/DiaryPanel";
import { K5AnnouncementsPanel } from "@/components/k5/panels/K5AnnouncementsPanel";
import { K5NewsPanel } from "@/components/k5/panels/K5NewsPanel";
import { K5DiaryPanel } from "@/components/k5/panels/K5DiaryPanel";

/**
 * Fixed right-edge floating action rail — mirrors the legacy student dashboard:
 * Talk to Us (chat), Announcement, News, Student Diary. All four are wired to
 * real backend data and open their own slide-in panel. Talk to Us opens a
 * signed sign-in link into the chat app directly instead of a panel.
 * variant="k5": the Grade K–5 look (Messages / News / Notices / Teacher), same data and panels.
 */
/** Fired on window with detail "announcements" | "diary" to open that rail panel from elsewhere on the page. */
export const RAIL_OPEN_EVENT = "is-rail-open";

export function RightActionRail({ chatUrl, diaryUrl, schoolUUID, userId, uniqueId, userRole, email, schoolName, variant = "default", studentUserId, hideNews = false, hideOnPhone = false }) {
  const queryClient = useQueryClient();
  // Parent dashboard: announcements and the diary badge are about the selected child (legacy fetched them with the
  // child's id), chat stays the parent's own. Students leave studentUserId unset, so nothing changes for them.
  const announcementUserId = studentUserId ?? userId;
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

  // Dummy (demo) student mode: announcements, news and the diary come from the dummy generator.
  const dummy = useDummyStudent();
  const announcementsQuery = useQuery({
    queryKey: ["student-announcements", schoolUUID, announcementUserId, dummy.key],
    queryFn: () =>
      dummy.enabled ? dummy.student.announcements() : getAnnouncementDetails({ schoolUUID, userId: announcementUserId, startFrom: 0, pageSize: 20 }),
    enabled: Boolean(schoolUUID && announcementUserId && dummy.settled),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
  const announcements = announcementsQuery.data?.announcements || [];
  const newAnnouncementCount = announcementsQuery.data?.newAnnouncementCount || 0;

  const newsQuery = useQuery({
    queryKey: ["news-articles", dummy.key],
    queryFn: () => (dummy.enabled ? dummy.student.newsList() : getAllArticles({ page: 1, size: 10 })),
    enabled: dummy.settled,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
  const articles = newsQuery.data?.list || [];
  const totalNews = newsQuery.data?.totalNews || 0;

  const chatCountQuery = useQuery({
    queryKey: ["chat-unseen-count", schoolUUID, userId],
    queryFn: () => getChatUnseenCount({ schoolUUID, userId, userRole, email }),
    enabled: Boolean(schoolUUID && userId),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const unseenChatMessages = chatCountQuery.data?.sumUnseen || 0;

  const diaryCountQuery = useQuery({
    queryKey: ["diary-unread-count", userId, dummy.key, studentUserId ?? null],
    queryFn: () => (dummy.enabled ? dummy.student.diaryUnreadCount() : getDiaryUnreadCount({ sessionUserId: userId, studentUserId })),
    enabled: Boolean(userId && dummy.settled),
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
  //
  // The SAME bridge also posts a finer-grained {type: "diary-bridge-update",
  // count, chatId, lastMessageId, chats} message — legacy's
  // renderSchoolDaiaryBtnCount() wires this into #schoolDiaryForm's four
  // hidden inputs, each with its own onchange handler
  // (checkUnreadMessageCount / refreshSchoolDiaryChat / lastMsgIdUpdated /
  // showAndHideAcknowledge) that together: paint the badge straight from the
  // pushed count, and re-render the thread list / the currently-open thread
  // live when a new message or a closed-thread status arrives for it. React
  // Query gives us the "only if currently visible" part of that for free —
  // invalidating a query only triggers a refetch while something has it
  // mounted, otherwise it just marks it stale for next time — so there is no
  // need to replicate the jQuery visibility checks (`.is(":visible")` /
  // `.hasClass("settings-open")`) those handlers run.
  useEffect(() => {
    if (!diaryUrl || !userId) return;
    let bridgeOrigin;
    try {
      bridgeOrigin = new URL(diaryUrl).origin;
    } catch {
      return;
    }
    const onMessage = (event) => {
      const msg = event.data;
      if (!msg || typeof msg !== "object") return;

      if (msg.type === "DAIRY_COUNT_CHANGED") {
        // This specific message's own listener (diaryBridgeEnsureConnected)
        // does check event.origin — matched here too.
        if (event.origin === bridgeOrigin && String(msg.userId) === String(userId)) refreshDiaryBadge();
        return;
      }

      if (msg.type === "diary-bridge-update") {
        // renderSchoolDaiaryBtnCount's own listener does NOT check
        // event.origin — matched here, not tightened, since that's the one
        // actually wired to a live iframe (diaryBridgeEnsureConnected above
        // is never called anywhere in the legacy codebase; this is the real
        // one) and an origin check here was silently dropping every message.
        // checkUnreadMessageCount: paint the badge straight from the pushed
        // count rather than round-tripping for it again.
        if (msg.count !== undefined) {
          queryClient.setQueryData(["diary-unread-count", userId], (old) => ({
            ...old,
            details: { ...old?.details, unreadMessageCount: Number(msg.count) || 0 },
          }));
        }
        // refreshSchoolDiaryChat / lastMsgIdUpdated / showAndHideAcknowledge:
        // a new message, or a status flip (open/closed — carried in `chats`,
        // part of the same thread-messages response as `threadStatus`), for
        // one or more threads. Refetch exactly those if currently open.
        const changedThreadIds = new Set();
        if (msg.chatId != null) changedThreadIds.add(String(msg.chatId));
        if (Array.isArray(msg.chats)) {
          msg.chats.forEach((chat) => chat?.chatId != null && changedThreadIds.add(String(chat.chatId)));
        }
        if (changedThreadIds.size > 0) {
          queryClient.invalidateQueries({
            predicate: (query) =>
              query.queryKey[0] === "diary-thread-messages" && changedThreadIds.has(String(query.queryKey[2])),
          });
        }
        // checkUnreadMessageCount's list-refresh branch: live-update the
        // thread list (previews/unread badges) while it's being browsed.
        queryClient.invalidateQueries({ queryKey: ["diary-threads", userId] });
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diaryUrl, userId]);

  // Other parts of the page (the parent mobile bottom bar) open a panel through this event: the rail owns the
  // panels, so they ask it instead of holding a copy of its state.
  useEffect(() => {
    const onOpen = (event) => {
      if (event.detail === "announcements") setAnnouncementsOpen(true);
      else if (event.detail === "diary") {
        setDiaryOpen(true);
        queryClient.invalidateQueries({ queryKey: ["diary-unread-count", userId] });
      }
    };
    window.addEventListener(RAIL_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(RAIL_OPEN_EVENT, onOpen);
  }, [queryClient, userId]);

  // Same data and props either way; the k5 variant swaps in the K–5 drawer look.
  const AnnouncementsView = variant === "k5" ? K5AnnouncementsPanel : AnnouncementsPanel;
  const NewsView = variant === "k5" ? K5NewsPanel : NewsPanel;
  const DiaryView = variant === "k5" ? K5DiaryPanel : DiaryPanel;

  const openTalkToUs = () => {
    const signInUrl = buildChatSignInUrl({
      chatUrl,
      uniqueId,
      deploymentMode: process.env.NEXT_PUBLIC_DEPLOYMENT_MODE,
    });
    if (signInUrl) window.open(signInUrl, "_blank", "noopener,noreferrer");
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

      {variant === "k5" ? (
        // Mockup rail: a column of pastel buttons on the right; below 760px a bottom tab bar.
        <div className="k5-rail fixed right-[calc(max(20px,(100vw-100%)/0)+0px)] top-[calc(var(--maintenance-banner-h,0px)+100px)] z-20 flex w-20 flex-col items-center gap-4 max-[760px]:inset-x-0 max-[760px]:bottom-0 max-[760px]:top-auto max-[760px]:z-40 max-[760px]:w-full max-[760px]:flex-row max-[760px]:items-start max-[760px]:justify-around max-[760px]:gap-0 max-[760px]:border-t-[3px] max-[760px]:border-k5-line max-[760px]:bg-k5-card max-[760px]:px-1 max-[760px]:pb-[max(8px,env(safe-area-inset-bottom))] max-[760px]:pt-2.5">
          <K5RailButton label="Talk to us" pin="msg" onClick={openTalkToUs} badge={unseenChatMessages} tint="#C3F0DC" rim="#0E8F67" ink="#0B6B4D">
            <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true"><path fill="#0B2447" d="M9.5 3C5.36 3 2 5.69 2 9c0 1.6.8 3.06 2.1 4.13L3 16.5l3.6-1.7c.9.27 1.88.42 2.9.42 4.14 0 7.5-2.76 7.5-6.1S13.64 3 9.5 3z" /><path fill="#0B2447" stroke="#C3F0DC" strokeWidth="1.6" d="M15.5 9.3c3.59 0 6.5 2.3 6.5 5.1 0 1.36-.68 2.58-1.8 3.5L21.2 21l-3.4-1.42c-.72.2-1.5.32-2.3.32-3.59 0-6.5-2.3-6.5-5.2s2.91-5.4 6.5-5.4z" /></svg>
          </K5RailButton>
          <K5RailButton label="Announcement" onClick={() => setAnnouncementsOpen(true)} badge={newAnnouncementCount} tint="#D3E7FF" rim="#1477F8" ink="#0E5BC2">
            <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true"><path fill="#0B2447" d="M2.5 9.6A1.6 1.6 0 0 1 4.1 8H8l7.3-4.6c.66-.42 1.5.06 1.5.84v13.52c0 .78-.84 1.26-1.5.84L8 14H7.6l.86 4.3a1 1 0 0 1-.98 1.2H5.9a1 1 0 0 1-.97-.77L3.9 14h.2A1.6 1.6 0 0 1 2.5 12.4z" /><rect x="18.4" y="9.2" width="3.2" height="3.6" rx="1.6" fill="#0B2447" /></svg>
          </K5RailButton>
          <K5RailButton label="News" onClick={() => setNewsOpen(true)} badge={totalNews} tint="#FFE59E" rim="#F2B705" ink="#8A5A00">
            <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true"><path fill="#0B2447" d="M6.5 4H20a1 1 0 0 1 1 1v13a2 2 0 0 1-2 2H5a3 3 0 0 1-3-3V8.5a1 1 0 0 1 1-1h2.5V5a1 1 0 0 1 1-1z" /><path d="M5.5 8.6V17a1 1 0 0 1-2 0V8.6" fill="none" stroke="#FFE59E" strokeWidth="1.3" /><rect x="8" y="7.2" width="5" height="4.2" rx=".6" fill="#FFE59E" /><rect x="9.2" y="8.4" width="2.6" height="1.8" fill="#0B2447" /><rect x="14.4" y="7.4" width="4.2" height="1.4" rx=".7" fill="#FFE59E" /><rect x="14.4" y="9.9" width="4.2" height="1.4" rx=".7" fill="#FFE59E" /><rect x="8" y="13" width="10.6" height="1.4" rx=".7" fill="#FFE59E" /><rect x="8" y="15.6" width="10.6" height="1.4" rx=".7" fill="#FFE59E" /></svg>
          </K5RailButton>
          <K5RailButton
            label="Student's Diary"
            onClick={() => {
              setDiaryOpen(true);
              refreshDiaryBadge();
            }}
            badge={unreadDiaryMessages}
            tint="#E8DAFF"
            rim="#9C6BF0"
            ink="#6A3FC4"
          >
            <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true"><rect x="4.5" y="2.5" width="13.5" height="19" rx="2.2" fill="#0B2447" /><rect x="17.2" y="5.4" width="2.8" height="2.6" rx="1" fill="#0B2447" /><rect x="17.2" y="10.7" width="2.8" height="2.6" rx="1" fill="#0B2447" /><rect x="17.2" y="16" width="2.8" height="2.6" rx="1" fill="#0B2447" /><circle cx="11.25" cy="9.6" r="2.6" fill="#E8DAFF" /><path d="M7 17.4c0-2.4 1.9-3.9 4.25-3.9s4.25 1.5 4.25 3.9z" fill="#E8DAFF" /></svg>
          </K5RailButton>
        </div>
      ) : (
      <div className={`fixed right-0 top-1/4 z-40 flex -translate-y-1/2 flex-col items-center gap-3 pr-2 ${hideOnPhone ? "max-sm:hidden" : ""}`}>
        <RailButton
          label="Talk to Us"
          onClick={openTalkToUs}
          badge={unseenChatMessages}
          className="bg-green-600 hover:bg-green-700"
        >
          <MessageCircle className="h-5 w-5" />
        </RailButton>
        <RailButton label="Announcement" onClick={() => setAnnouncementsOpen(true)} badge={newAnnouncementCount}>
          <Megaphone className="h-5 w-5" />
        </RailButton>
        {!hideNews && (
          <RailButton label="News" onClick={() => setNewsOpen(true)} badge={totalNews}>
            <Newspaper className="h-5 w-5" />
          </RailButton>
        )}
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
      )}

      {/* k5-legacy: inside the K–5 shell these shared panels follow the K–5 tokens (app/k5-modules.css). */}
      <div className={variant === "k5" ? "k5-legacy contents" : "contents"}>
      {announcementsOpen && (
        <AnnouncementsView
          announcements={announcements}
          newCount={newAnnouncementCount}
          schoolUUID={schoolUUID}
          userId={userId}
          onClose={() => setAnnouncementsOpen(false)}
        />
      )}

      {newsOpen && !hideNews && <NewsView articles={articles} totalNews={totalNews} userId={userId} onClose={() => setNewsOpen(false)} />}

      {diaryOpen && (
        <DiaryView
          sessionUserId={userId}
          schoolName={schoolName}
          onClose={() => {
            setDiaryOpen(false);
            refreshDiaryBadge();
          }}
        />
      )}
      </div>
    </>
  );
}

// Grade K–5 rail button (Playful.dc.html .rail): 62px pastel circle on a coloured rim, label
// under it, red count badge. In the mobile tab bar: a quarter of the width, 46px circle.
function K5RailButton({ label, onClick, badge, tint, rim, ink, pin, children }) {
  return (
    <button
      type="button"
      data-pin={pin}
      onClick={onClick}
      aria-label={badge ? `${label}, ${badge} new` : label}
      className="relative flex w-20 cursor-pointer flex-col items-center gap-2 rounded-[18px] border-none bg-transparent py-1 text-center text-xs font-black leading-[1.15] text-k5-ink max-[760px]:w-1/4 max-[760px]:gap-1.5 max-[760px]:p-0"
    >
      <span
        className="flex h-[62px] w-[62px] items-center justify-center rounded-full shadow-[0_6px_0_var(--rim)] max-[760px]:h-[46px] max-[760px]:w-[46px] max-[760px]:shadow-[0_4px_0_var(--rim)] max-[760px]:[&>svg]:h-6 max-[760px]:[&>svg]:w-6"
        style={{ background: tint, color: ink, "--rim": rim }}
      >
        {children}
      </span>
      {label}
      {badge ? (
        <span
          aria-hidden="true"
          className="absolute -right-0.5 -top-1 flex h-[30px] min-w-[30px] items-center justify-center rounded-full border-[3px] border-k5-card bg-k5-red px-1.5 text-[13px] font-black text-white max-[760px]:-top-1.5 max-[760px]:right-[calc(50%-36px)] max-[760px]:h-6 max-[760px]:min-w-6 max-[760px]:border-2 max-[760px]:px-[5px] max-[760px]:text-xs"
        >
          {badge}
        </span>
      ) : null}
    </button>
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
