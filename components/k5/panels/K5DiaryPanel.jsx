"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Lock, NotebookText } from "lucide-react";
import { STAFF_SENDER_ROLES, formatWhen, salutationFor } from "@/components/dashboard/DiaryPanel";
import { EmptyNote, K5Drawer } from "@/components/k5/panels/K5Drawer";
import { markDiaryThreadRead } from "@/utils/diaryClient";
import { useDummyStudent } from "@/hooks/useDummyStudent";
import { useChatScroll, useDiaryMessages, useDiaryThreads, useFloatingDate, useLoadMoreAtEnd } from "@/hooks/useDiaryPaging";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { DiaryAvatar, DiaryLoadError, DiaryMessageText, FloatingDateChip } from "@/components/dashboard/DiaryBits";
import { diaryInstant } from "@/utils/diaryDates";
import { isOwnDiaryMessage } from "@/utils/diaryChat";
import { DEFAULT_DIARY_CHAT_WITH, DIARY_CHAT_WITH, filterThreadsByChatWith, noDiaryEntriesText } from "@/utils/diaryFilter";
import { K5Loading, K5ListSkeleton } from "@/components/k5/K5Skeletons";

// Notebook paper (mockup PAPER): red margin line + blue ruling on cream.
const PAPER =
  "linear-gradient(to right, transparent 48px, #F4A3A3 48px, #F4A3A3 50px, transparent 50px) local, repeating-linear-gradient(to bottom, transparent 0px, transparent 34px, #DCE7F7 34px, #DCE7F7 36px) local, #FFFBEF";

function ThreadList({ threads, chatWith, onSelect, sourceTimezone, endRef, loadingMore }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0">
      {threads.length === 0 && !loadingMore && (
        <li>
          <EmptyNote>{noDiaryEntriesText(chatWith)}</EmptyNote>
        </li>
      )}
      {threads.map((thread) => (
        <li key={thread.threadId}>
          <button
            type="button"
            onClick={() => onSelect(thread.threadId)}
            className="flex w-full cursor-pointer items-center gap-3 rounded-[22px] border-[3px] border-[#D8C7F7] bg-white p-3 text-start text-[#2B2B3A] shadow-[0_3px_0_#D8C7F7]"
          >
            <DiaryAvatar name={thread.teacherName} src={thread.profilePic} className="h-11 w-11 bg-[#9C6BF0]" initialsClassName="text-[15px] font-black text-white" />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex items-center gap-2">
                <span className="truncate font-k5-display text-lg font-semibold">{`${salutationFor(thread.teacherGender)} ${thread.teacherName}`.trim()}</span>
                {thread.unreadCount > 0 && <span className="flex-none rounded-full bg-k5-red px-2 py-0.5 text-xs font-black text-white">{thread.unreadCount}</span>}
              </span>
              <span className="truncate text-[15px] font-bold text-[#4A5675]">{thread.latestMessage}</span>
            </span>
            <span className="flex-none text-[11px] font-extrabold text-[#6B7489]">{formatWhen(thread.lastMessageAt, sourceTimezone)}</span>
          </button>
        </li>
      ))}
      <li ref={endRef} aria-hidden="true" className="h-px" />
      {loadingMore && (
        <li>
          <K5Loading label="Loading more notes" className="">
            <K5ListSkeleton rows={1} />
          </K5Loading>
        </li>
      )}
    </ul>
  );
}

function Note({ message, courseName, schoolName, viewerUserId, viewerName, sourceTimezone }) {
  const isOwn = isOwnDiaryMessage(message, { userId: viewerUserId, role: "STUDENT", userName: viewerName });
  const isStaff = STAFF_SENDER_ROLES.includes((message.senderRole || "").toUpperCase());
  const recipient = message.mentions?.find((m) => m.roleType === "PARENT")?.userName || "Parent";
  return (
    <div data-diary-at={diaryInstant(message.createdAt, sourceTimezone)?.getTime()} className={`flex w-full ${isOwn ? "justify-end" : "justify-start"}`}>
      <div
        className="flex max-w-[92%] flex-col gap-1 rounded-[18px_18px_18px_4px] border-2 border-[#D8C7F7] px-3 pb-1.5 pt-2 text-[#2B2B3A] shadow-[0_2px_0_#D8C7F7]"
        style={{ background: isOwn ? "#EAF3FF" : "#FFFFFF" }}
      >
        {!isOwn && (
          <span className="text-xs font-black text-[#6E44C9]">
            {salutationFor(message.senderGender)} {message.senderName}
            {courseName ? ` · ${courseName}` : ""}
          </span>
        )}
        {isStaff && (
          <span className="text-[15px] font-bold">
            {recipient}, greetings from {schoolName}!
          </span>
        )}
        <DiaryMessageText text={message.message} mentions={message.mentions} className="m-0 whitespace-pre-wrap text-base font-bold leading-[1.4] [overflow-wrap:anywhere]" mentionClassName="font-black text-[#1F9E5A]" />
        {isStaff && <span className="text-sm font-bold text-[#4A5675]">{schoolName} Family</span>}
        <span className="self-end text-[11px] font-extrabold text-[#6B7489]">{formatWhen(message.createdAt, sourceTimezone)}</span>
      </div>
    </div>
  );
}

function ThreadView({ threadId, sessionUserId, schoolName }) {
  const dummy = useDummyStudent();
  const queryClient = useQueryClient();
  const { query: messagesQuery, messages, courseName, sourceTimezone } = useDiaryMessages({ sessionUserId, threadId });
  const { context } = useDashboardContext();
  const anchorRef = useRef(null);
  // Opens on the newest note; the older ones load in above when the top is reached (legacy loadOldMessages).
  useChatScroll(anchorRef, {
    ready: !messagesQuery.isLoading,
    pageCount: messagesQuery.data?.pages.length || 0,
    hasNextPage: messagesQuery.hasNextPage,
    isFetchingNextPage: messagesQuery.isFetchingNextPage,
    fetchNextPage: messagesQuery.fetchNextPage,
  });
  const floatingDate = useFloatingDate(anchorRef, { ready: !messagesQuery.isLoading, count: messages.length });

  // Dummy threads do not exist server-side: legacy skips the mark-read call in dummy mode.
  useEffect(() => {
    if (!sessionUserId || !threadId || !dummy.settled || dummy.enabled) return;
    // Once the thread is marked read the badge and the list's unread counts are refreshed (legacy gotoChat).
    markDiaryThreadRead({ account: context?.uniqueId, threadId }).finally(() => {
      queryClient.invalidateQueries({ queryKey: ["diary-unread-count", sessionUserId] });
      queryClient.invalidateQueries({ queryKey: ["diary-threads", sessionUserId] });
    });
  }, [sessionUserId, threadId, dummy.settled, dummy.enabled, queryClient, context?.uniqueId]);

  if (messagesQuery.isLoading) {
    return (
      <K5Loading label="Loading the notes" className="">
        <K5ListSkeleton rows={3} />
      </K5Loading>
    );
  }
  if (messagesQuery.isError && messages.length === 0) {
    return <DiaryLoadError onRetry={() => messagesQuery.refetch()} className="text-[#2B2B3A]" buttonClassName="border-[3px] border-[#6E44C9] bg-[#9C6BF0] font-k5-display text-white" />;
  }
  if (messages.length === 0) return <EmptyNote>No notes yet.</EmptyNote>;
  return (
    <>
      <span ref={anchorRef} aria-hidden="true" className="hidden" />
      <FloatingDateChip label={floatingDate.label} visible={floatingDate.visible} className="bg-[#6E44C9] text-white" />
      {messagesQuery.isFetchingNextPage && (
        <K5Loading label="Loading older notes" className="">
          <K5ListSkeleton rows={1} />
        </K5Loading>
      )}
      {messages.map((message) => (
        <Note key={message.id} message={message} courseName={courseName} schoolName={schoolName} viewerUserId={sessionUserId} viewerName={context?.userName} sourceTimezone={sourceTimezone} />
      ))}
    </>
  );
}

/**
 * K–5 look of the Student’s Diary drawer (mockup "Diary"): purple header, a ruled notebook page,
 * notes as chat bubbles and a "read only" footer. Same threads + messages as the legacy panel;
 * students never get a reply box there either.
 */
export function K5DiaryPanel({ sessionUserId, schoolName, onClose }) {
  const { query: threadsQuery, threads, sourceTimezone } = useDiaryThreads({ sessionUserId });
  const endRef = useLoadMoreAtEnd(threadsQuery);
  const [chatWith, setChatWith] = useState(DEFAULT_DIARY_CHAT_WITH);
  const shownThreads = filterThreadsByChatWith(threads, chatWith);
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const selectedName = threads.find((t) => t.threadId === selectedThreadId)?.teacherName;
  const unread = threads.reduce((sum, t) => sum + (t.unreadCount || 0), 0);

  return (
    <K5Drawer
      title={selectedThreadId && selectedName ? selectedName : "Student’s Diary"}
      subtitle={selectedThreadId ? "Notes from your teacher" : unread > 0 ? `${unread} new` : "Notes from school"}
      icon={<NotebookText className="h-[30px] w-[30px] text-[#0B2447]" aria-hidden="true" />}
      accent="#9C6BF0"
      pastel="#E8DAFF"
      bg="#F6F0FF"
      leading={
        selectedThreadId ? (
          <button
            type="button"
            onClick={() => setSelectedThreadId(null)}
            aria-label="Back to diary list"
            className="flex h-11 w-11 flex-none cursor-pointer items-center justify-center rounded-full border-[3px] border-white bg-[#6E44C9]"
          >
            <ArrowLeft className="h-5 w-5 text-white" strokeWidth={3} aria-hidden="true" />
          </button>
        ) : null
      }
      bodyClassName="p-0"
      onClose={onClose}
      footer={
        <div className="flex flex-none items-center justify-center gap-2 border-t-[3px] border-[#9C6BF0] bg-[#E8DAFF] px-3.5 py-3 text-center text-sm font-extrabold text-[#4E2C9A]">
          <Lock className="h-[18px] w-[18px] flex-none" aria-hidden="true" />
          This is read only. Your teacher writes here.
        </div>
      }
    >
      {selectedThreadId ? (
        <div className="flex min-h-full flex-col gap-3.5 py-4 pl-[60px] pr-3.5 overflow-y-auto overscroll-contain" style={{ background: PAPER }}>
          <ThreadView threadId={selectedThreadId} sessionUserId={sessionUserId} schoolName={schoolName} />
        </div>
      ) : (
        <div className="p-3.5">
          {threadsQuery.isLoading ? (
            <K5Loading label="Loading your diary" className="">
              <K5ListSkeleton rows={4} />
            </K5Loading>
          ) : threadsQuery.isError && threads.length === 0 ? (
            <DiaryLoadError onRetry={() => threadsQuery.refetch()} className="text-[#2B2B3A]" buttonClassName="border-[3px] border-[#6E44C9] bg-[#9C6BF0] font-k5-display text-white" />
          ) : (
            <div className="flex flex-col gap-3">
              <div role="tablist" aria-label="Chat with" className="flex gap-2">
                {DIARY_CHAT_WITH.map((option) => {
                  const on = option.value === chatWith;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="tab"
                      aria-selected={on}
                      onClick={() => setChatWith(option.value)}
                      className={`min-h-11 flex-1 cursor-pointer rounded-full border-[3px] font-k5-display text-base font-semibold ${on ? "border-[#6E44C9] bg-[#9C6BF0] text-white shadow-[0_3px_0_#6E44C9]" : "border-[#D8C7F7] bg-white text-[#4E2C9A]"}`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
              <ThreadList threads={shownThreads} chatWith={chatWith} onSelect={setSelectedThreadId} sourceTimezone={sourceTimezone} endRef={endRef} loadingMore={threadsQuery.isFetchingNextPage} />
            </div>
          )}
        </div>
      )}
    </K5Drawer>
  );
}
