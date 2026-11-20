"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Bookmark, NotebookText, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useDateFnsLocale } from "@/i18n/dateLocale";
import { markDiaryThreadRead } from "@/utils/diaryClient";
import { useDummyStudent } from "@/hooks/useDummyStudent";
import { useChatScroll, useDiaryMessages, useDiaryParentName, useDiaryThreads, useFloatingDate, useLoadMoreAtEnd } from "@/hooks/useDiaryPaging";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { DiaryAvatar, DiaryLoadError, DiaryMessageText, FloatingDateChip } from "@/components/dashboard/DiaryBits";
import { Skeleton } from "@/components/ui/skeleton";
import { diaryInstant, formatDiaryDate } from "@/utils/diaryDates";
import { isOwnDiaryMessage } from "@/utils/diaryChat";
import { DEFAULT_DIARY_CHAT_WITH, DIARY_CHAT_WITH, filterThreadsByChatWith, noDiaryEntriesText } from "@/utils/diaryFilter";

// Roles that trigger the "Greetings from {school}!" letter template in
// getParentSchoolDiaryTeacherCard/-ReplyCard (PARENT_MENTION_ROLE in
// parentSchoolDiary.js) — the counterpart is always addressed as "Parent"
// regardless of who's actually reading the thread.
export const STAFF_SENDER_ROLES = ["TEACHER", "DIRECTOR", "SCHOOL", "ADMIN"];

export function salutationFor(gender) {
  const normalized = (gender || "").toLowerCase();
  if (normalized === "male") return "Mr.";
  if (normalized === "female") return "Ms.";
  return "";
}

// DISPLAY_DATETIME_FORMATTER ("ddd, DD MMM, YYYY hh:mm A"): the server date is in details.sourceTimezone and is shown in
// the viewer's zone (utils/diaryDates.js; Asia/Singapore when the source zone is missing). `locale`: optional date-fns locale.
export function formatWhen(value, sourceTimezone, locale) {
  return formatDiaryDate(value, sourceTimezone, undefined, { locale });
}

/** A few grey rows while diary data loads (shadcn Skeleton). */
function DiarySkeleton({ rows = 4 }) {
  const tc = useTranslations("common");
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-3 p-3">
      <span className="sr-only">{tc("status.loading")}</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-xl border border-slate-100 p-3">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      ))}
    </div>
  );
}

function ThreadList({ threads, chatWith, onSelect, sourceTimezone, endRef, loadingMore }) {
  const t = useTranslations("diary");
  const dateLocale = useDateFnsLocale();
  return (
    <ul className="divide-y divide-slate-100">
      {threads.length === 0 && !loadingMore && (
        <li className="p-3 text-center text-sm font-semibold text-black/80">{noDiaryEntriesText(chatWith, t)}</li>
      )}
      {threads.map((thread) => (
        <li key={thread.threadId} className="p-3 hover:bg-black/5">
          <button
            type="button"
            onClick={() => onSelect(thread.threadId)}
            className="flex w-full items-start gap-2 text-left cursor-pointer"
          >
            <DiaryAvatar name={thread.teacherName} src={thread.profilePic} className="h-10 w-10 bg-primary" initialsClassName="text-xs font-bold text-white" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-bold text-black">{`${salutationFor(thread.teacherGender)} ${thread.teacherName}`.trim()}</span>
                {thread.unreadCount > 0 && (
                  <span className="flex-shrink-0 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {thread.unreadCount}
                  </span>
                )}
              </div>
              <p className="mt-0.5 truncate text-xs text-black/60">{thread.latestMessage}</p>
            </div>
            <span className="flex-shrink-0 text-[10px] text-black/40">{formatWhen(thread.lastMessageAt, sourceTimezone, dateLocale)}</span>
          </button>
        </li>
      ))}
      <li ref={endRef} aria-hidden="true" className="h-px" />
      {loadingMore && (
        <li>
          <DiarySkeleton rows={1} />
        </li>
      )}
    </ul>
  );
}

/**
 * One diary entry — port of getParentSchoolDiaryTeacherCard /
 * getParentSchoolDiaryReplyCard. The viewer's own messages (parent-card)
 * float right on a blue-tinted card with no sender header; everyone else's
 * (teacher-card) float left on a white card with a sender-name header. The
 * "Greetings from {school}! / Hope you are doing well. ... Gratitude and
 * prayers," letter wrapper only appears around messages from staff roles —
 * a real reply from the thread's parent, or the viewer's own message, is
 * just plain text.
 */
function DiaryEntryCard({ message, courseName, schoolName, parentName, viewerUserId, viewerName, sourceTimezone }) {
  const isOwn = isOwnDiaryMessage(message, { userId: viewerUserId, role: "STUDENT", userName: viewerName });
  const t = useTranslations("diary");
  const dateLocale = useDateFnsLocale();
  const isStaffSender = STAFF_SENDER_ROLES.includes((message.senderRole || "").toUpperCase());

  return (
    <div data-diary-at={diaryInstant(message.createdAt, sourceTimezone)?.getTime()} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div
        className={`w-full mt-2 rounded-2xl border border-slate-300/70 p-4 shadow-sm ${
          isOwn ? "bg-gradient-to-br from-sky-50 to-sky-100" : "bg-white"
        }`}
      >
        {!isOwn && (
          <p className="mb-1 font-bold text-primary">
            {salutationFor(message.senderGender)} {message.senderName}
            {courseName ? ` | ${courseName}` : ""}
          </p>
        )}
        {isStaffSender && (
          <div className="mb-1">
            {/* useDiaryParentName() falls back to the English word "Parent" */}
            <p className="font-caveat text-xl font-bold text-black">{parentName === "Parent" ? t("parent") : parentName}</p>
            <p className="font-caveat text-lg font-semibold text-primary">{t("letter.greetings", { school: schoolName })}</p>
            <p className="font-caveat text-lg font-semibold text-black">{t("letter.hopeWell")}</p>
          </div>
        )}
        <DiaryMessageText text={message.message} mentions={message.mentions} className="font-caveat my-3 whitespace-pre-wrap text-xl text-black" />
        {isStaffSender && (
          <div className="mb-1">
            <p className="font-caveat text-lg text-black">{t("letter.gratitude")}</p>
            <p className="font-caveat text-lg text-black">{t("letter.family", { school: schoolName })}</p>
          </div>
        )}
        <small className="text-[11px] text-black/80">{formatWhen(message.createdAt, sourceTimezone, dateLocale)}</small>
      </div>
    </div>
  );
}

/**
 * The "school-diary-notebook" wrapper — a spiral-bound blue left edge over
 * faint graph-paper ruling (parentSchoolDiaryGetStyles' .school-diary-notebook
 * / .card-body background), with a bookmark ribbon in the corner. Read-only:
 * students never get the reply editor in legacy either (chatDetailsConent only
 * appends getParentSchoolDiaryReplyEditor for USER_ROLE != "STUDENT").
 */
function ThreadView({ threadId, sessionUserId, schoolName }) {
  const dummy = useDummyStudent();
  const queryClient = useQueryClient();
  const { query: messagesQuery, messages, courseName, sourceTimezone } = useDiaryMessages({ sessionUserId, threadId });
  const parentName = useDiaryParentName({ threadId });
  const { context } = useDashboardContext();
  const t = useTranslations("diary");
  const anchorRef = useRef(null);
  // Opens on the newest message; the older ones load in above when the top is reached (legacy loadOldMessages).
  useChatScroll(anchorRef, {
    ready: !messagesQuery.isLoading,
    pageCount: messagesQuery.data?.pages.length || 0,
    hasNextPage: messagesQuery.hasNextPage,
    isFetchingNextPage: messagesQuery.isFetchingNextPage,
    fetchNextPage: messagesQuery.fetchNextPage,
  });
  const floatingDate = useFloatingDate(anchorRef, { ready: !messagesQuery.isLoading, count: messages.length });

  // Dummy threads don't exist server-side: legacy skips the mark-read call in dummy mode.
  useEffect(() => {
    if (!sessionUserId || !threadId || !dummy.settled || dummy.enabled) return;
    // Once the thread is marked read the badge and the list's unread counts are refreshed (legacy gotoChat).
    markDiaryThreadRead({ account: context?.uniqueId, threadId }).finally(() => {
      queryClient.invalidateQueries({ queryKey: ["diary-unread-count", sessionUserId] });
      queryClient.invalidateQueries({ queryKey: ["diary-threads", sessionUserId] });
    });
  }, [sessionUserId, threadId, dummy.settled, dummy.enabled, queryClient, context?.uniqueId]);

  return (
    <div ref={anchorRef} className="flex h-full flex-col p-3">
      <div
        className="relative flex-1  rounded-xl border-l-4 border-sky-500 py-4 pl-10 pr-3"
        style={{
          backgroundImage:
            "linear-gradient(transparent 31px, rgba(0,132,255,0.08) 32px), linear-gradient(90deg, transparent 31px, rgba(0,132,255,0.08) 32px)",
          backgroundSize: "32px 32px",
        }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-1 top-0 w-3 bg-repeat-y overflow-y-auto"
          style={{
            backgroundImage:
              "radial-gradient(circle at center, white 3px, #64748b 3px, #64748b 4px, transparent 4px)",
            backgroundSize: "100% 28px",
            backgroundRepeat:"repeat-y"
          }}
        />
        <Bookmark aria-hidden="true" className="absolute -top-1 right-4 h-7 w-5 fill-primary text-primary" />
        {/* <FloatingDateChip label={floatingDate.label} visible={floatingDate.visible} className="bg-primary text-white" /> */}

        <div className="space-y-4">
          {messagesQuery.isFetchingNextPage && <DiarySkeleton rows={1} />}
          {messagesQuery.isLoading ? (
            <DiarySkeleton rows={3} />
          ) : messagesQuery.isError && messages.length === 0 ? (
            <DiaryLoadError onRetry={() => messagesQuery.refetch()} className="text-black/80" buttonClassName="bg-primary text-white" />
          ) : messages.length === 0 ? (
            <p className="text-sm text-black/80 p-5">{t("noMessages")}</p>
          ) : (
            messages.map((message) => (
              <DiaryEntryCard
                key={message.id}
                message={message}
                courseName={courseName}
                schoolName={schoolName}
                parentName={parentName}
                viewerUserId={sessionUserId}
                viewerName={context?.userName}
                sourceTimezone={sourceTimezone}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Slide-in "Student Diary" panel — the legacy School Diary teacher<->student
 * messaging thread system. Read-only here: in legacy, the reply editor is
 * never rendered for USER_ROLE == "STUDENT" (threads are created and replied
 * to by teachers/parents only).
 */
export function DiaryPanel({ sessionUserId, schoolName, onClose }) {
  const { query: threadsQuery, threads, sourceTimezone } = useDiaryThreads({ sessionUserId });
  const endRef = useLoadMoreAtEnd(threadsQuery);
  const [chatWith, setChatWith] = useState(DEFAULT_DIARY_CHAT_WITH);
  const shownThreads = filterThreadsByChatWith(threads, chatWith);
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const selectedThreadName = threads.find((thread) => thread.threadId === selectedThreadId)?.teacherName;
  const t = useTranslations("diary");
  const tc = useTranslations("common");

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-[600px] flex-col bg-white shadow-xl">
        <button
          type="button"
          onClick={onClose}
          aria-label={tc("actions.close")}
          className="absolute -left-4 cursor-pointer top-3 flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white shadow-md hover:bg-red-700"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
          {selectedThreadId && (
            <button
              type="button"
              onClick={() => setSelectedThreadId(null)}
              aria-label={t("backToList")}
              className="-ml-1 flex h-6 w-6 flex-shrink-0 items-center justify-center text-black hover:text-primary"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <NotebookText className="h-5 w-5 flex-shrink-0 text-primary" aria-hidden="true" />
          <h2 className="truncate text-base font-extrabold text-black">
            {selectedThreadId && selectedThreadName ? t("titleWithName", { name: selectedThreadName }) : t("title")}
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto">
          {selectedThreadId ? (
            <ThreadView threadId={selectedThreadId} sessionUserId={sessionUserId} schoolName={schoolName} />
          ) : threadsQuery.isLoading ? (
            <DiarySkeleton />
          ) : threadsQuery.isError && threads.length === 0 ? (
            <DiaryLoadError onRetry={() => threadsQuery.refetch()} className="text-black/80" buttonClassName="bg-primary text-white" />
          ) : (
            <>
              <div className="border-b border-slate-100 px-4 py-3">
                <label htmlFor="diary-chat-with" className="sr-only">
                  {t("chatWithLabel")}
                </label>
                <select
                  id="diary-chat-with"
                  value={chatWith}
                  onChange={(event) => setChatWith(event.target.value)}
                  className="w-full cursor-pointer rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm font-semibold text-black"
                >
                  {DIARY_CHAT_WITH.map((option) => (
                    <option key={option.value} value={option.value}>
                      {t(option.messageKey)}
                    </option>
                  ))}
                </select>
              </div>
              <ThreadList threads={shownThreads} chatWith={chatWith} onSelect={setSelectedThreadId} sourceTimezone={sourceTimezone} endRef={endRef} loadingMore={threadsQuery.isFetchingNextPage} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
