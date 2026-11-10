"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Lock, NotebookText } from "lucide-react";
import { STAFF_SENDER_ROLES, formatWhen, salutationFor } from "@/components/dashboard/DiaryPanel";
import { EmptyNote, K5Drawer } from "@/components/k5/panels/K5Drawer";
import { getDiaryThreadList, getDiaryThreadMessages, markDiaryThreadRead } from "@/services/diaryApi";
import { useDummyStudent } from "@/hooks/useDummyStudent";

// Notebook paper (mockup PAPER): red margin line + blue ruling on cream.
const PAPER =
  "linear-gradient(to right, transparent 48px, #F4A3A3 48px, #F4A3A3 50px, transparent 50px) local, repeating-linear-gradient(to bottom, transparent 0px, transparent 34px, #DCE7F7 34px, #DCE7F7 36px) local, #FFFBEF";

function ThreadList({ threads, onSelect }) {
  if (threads.length === 0) return <EmptyNote>No diary notes yet.</EmptyNote>;
  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0">
      {threads.map((thread) => (
        <li key={thread.threadId}>
          <button
            type="button"
            onClick={() => onSelect(thread.threadId)}
            className="flex w-full cursor-pointer items-center gap-3 rounded-[22px] border-[3px] border-[#D8C7F7] bg-white p-3 text-start text-[#2B2B3A] shadow-[0_3px_0_#D8C7F7]"
          >
            <span aria-hidden="true" className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-[#9C6BF0] text-[15px] font-black text-white">
              {String(thread.teacherName || "?").trim().charAt(0).toUpperCase()}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex items-center gap-2">
                <span className="truncate font-k5-display text-lg font-semibold">{thread.teacherName}</span>
                {thread.unreadCount > 0 && <span className="flex-none rounded-full bg-k5-red px-2 py-0.5 text-xs font-black text-white">{thread.unreadCount}</span>}
              </span>
              <span className="truncate text-[15px] font-bold text-[#4A5675]">{thread.latestMessage}</span>
            </span>
            <span className="flex-none text-[11px] font-extrabold text-[#6B7489]">{formatWhen(thread.lastMessageAt)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function Note({ message, courseName, schoolName, viewerUserId }) {
  const isOwn = String(message.senderUserId) === String(viewerUserId);
  const isStaff = STAFF_SENDER_ROLES.includes((message.senderRole || "").toUpperCase());
  const recipient = message.mentions?.find((m) => m.roleType === "PARENT")?.userName || "Parent";
  return (
    <div className={`flex w-full ${isOwn ? "justify-end" : "justify-start"}`}>
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
        <p className="m-0 whitespace-pre-wrap text-base font-bold leading-[1.4] [overflow-wrap:anywhere]">{message.message}</p>
        {isStaff && <span className="text-sm font-bold text-[#4A5675]">{schoolName} Family</span>}
        <span className="self-end text-[11px] font-extrabold text-[#6B7489]">{formatWhen(message.createdAt)}</span>
      </div>
    </div>
  );
}

function ThreadView({ threadId, sessionUserId, schoolName }) {
  const dummy = useDummyStudent();
  const messagesQuery = useQuery({
    queryKey: ["diary-thread-messages", sessionUserId, threadId, dummy.key],
    queryFn: () => (dummy.enabled ? dummy.student.diaryMessages(threadId) : getDiaryThreadMessages({ sessionUserId, threadId })),
    enabled: Boolean(sessionUserId && threadId && dummy.settled),
    refetchOnWindowFocus: false,
  });

  // Dummy threads do not exist server-side: legacy skips the mark-read call in dummy mode.
  useEffect(() => {
    if (sessionUserId && threadId && dummy.settled && !dummy.enabled) markDiaryThreadRead({ sessionUserId, threadId });
  }, [sessionUserId, threadId, dummy.settled, dummy.enabled]);

  const messages = messagesQuery.data?.details?.messages || [];
  const courseName = messagesQuery.data?.details?.courseName;

  if (messagesQuery.isLoading) return <EmptyNote>Loading…</EmptyNote>;
  if (messages.length === 0) return <EmptyNote>No notes yet.</EmptyNote>;
  return messages.map((message) => (
    <Note key={message.id} message={message} courseName={courseName} schoolName={schoolName} viewerUserId={sessionUserId} />
  ));
}

/**
 * K–5 look of the Student’s Diary drawer (mockup "Diary"): purple header, a ruled notebook page,
 * notes as chat bubbles and a "read only" footer. Same threads + messages as the legacy panel;
 * students never get a reply box there either.
 */
export function K5DiaryPanel({ sessionUserId, schoolName, onClose }) {
  const dummy = useDummyStudent();
  const threadsQuery = useQuery({
    queryKey: ["diary-threads", sessionUserId, dummy.key],
    queryFn: () => (dummy.enabled ? dummy.student.diaryThreads() : getDiaryThreadList({ sessionUserId })),
    enabled: Boolean(sessionUserId && dummy.settled),
    refetchOnWindowFocus: false,
  });
  const threads = threadsQuery.data?.details?.threads || [];
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
          {threadsQuery.isLoading ? <EmptyNote>Loading…</EmptyNote> : <ThreadList threads={threads} onSelect={setSelectedThreadId} />}
        </div>
      )}
    </K5Drawer>
  );
}
