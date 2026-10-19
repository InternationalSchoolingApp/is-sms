"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ArrowLeft, Bookmark, NotebookText, X } from "lucide-react";
import { getDiaryThreadList, getDiaryThreadMessages, markDiaryThreadRead } from "@/services/diaryApi";

// Roles that trigger the "Greetings from {school}!" letter template in
// getParentSchoolDiaryTeacherCard/-ReplyCard (PARENT_MENTION_ROLE in
// parentSchoolDiary.js) — the counterpart is always addressed as "Parent"
// regardless of who's actually reading the thread.
const STAFF_SENDER_ROLES = ["TEACHER", "DIRECTOR", "SCHOOL", "ADMIN"];

function salutationFor(gender) {
  const normalized = (gender || "").toLowerCase();
  if (normalized === "male") return "Mr.";
  if (normalized === "female") return "Ms.";
  return "";
}

function formatWhen(value) {
  if (!value) return "";
  const parsed = parseISO(String(value));
  // DISPLAY_DATETIME_FORMATTER ("ddd, DD MMM, YYYY hh:mm A") from timezoneConverter.js.
  return Number.isNaN(parsed.getTime()) ? "" : format(parsed, "EEE, d MMM, yyyy hh:mm a");
}

function ThreadList({ threads, onSelect }) {
  if (threads.length === 0) return <p className="text-sm text-black/50">No diary conversations yet.</p>;
  return (
    <ul className="divide-y divide-slate-100">
      {threads.map((thread) => (
        <li key={thread.threadId}>
          <button
            type="button"
            onClick={() => onSelect(thread.threadId)}
            className="flex w-full items-start gap-2 py-3 text-left hover:bg-black/5"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-bold text-black">{thread.teacherName}</span>
                {thread.unreadCount > 0 && (
                  <span className="flex-shrink-0 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {thread.unreadCount}
                  </span>
                )}
              </div>
              <p className="mt-0.5 truncate text-xs text-black/60">{thread.latestMessage}</p>
            </div>
            <span className="flex-shrink-0 text-[10px] text-black/40">{formatWhen(thread.lastMessageAt)}</span>
          </button>
        </li>
      ))}
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
function DiaryEntryCard({ message, courseName, schoolName, viewerUserId }) {
  const isOwn = String(message.senderUserId) === String(viewerUserId);
  const isStaffSender = STAFF_SENDER_ROLES.includes((message.senderRole || "").toUpperCase());
  const recipientName = message.mentions?.find((mention) => mention.roleType === "PARENT")?.userName || "Parent";

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[88%] rounded-2xl border border-slate-300/70 p-4 shadow-sm ${
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
            <p className="font-caveat text-xl font-bold text-black">{recipientName}</p>
            <p className="font-caveat text-lg font-semibold text-primary">Greetings from {schoolName}!</p>
            <p className="font-caveat text-lg font-semibold text-black">Hope you are doing well.</p>
          </div>
        )}
        <p className="font-caveat my-3 whitespace-pre-wrap text-xl text-black">{message.message}</p>
        {isStaffSender && (
          <div className="mb-1">
            <p className="font-caveat text-lg text-black">Gratitude and prayers,</p>
            <p className="font-caveat text-lg text-black">{schoolName} Family</p>
          </div>
        )}
        <small className="text-[11px] text-black/40">{formatWhen(message.createdAt)}</small>
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
function ThreadView({ threadId, sessionUserId, schoolName, onBack }) {
  const messagesQuery = useQuery({
    queryKey: ["diary-thread-messages", sessionUserId, threadId],
    queryFn: () => getDiaryThreadMessages({ sessionUserId, threadId }),
    enabled: Boolean(sessionUserId && threadId),
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (sessionUserId && threadId) markDiaryThreadRead({ sessionUserId, threadId });
  }, [sessionUserId, threadId]);

  const messages = messagesQuery.data?.details?.messages || [];
  const courseName = messagesQuery.data?.details?.courseName;

  return (
    <div className="flex h-full flex-col">
      <button
        type="button"
        onClick={onBack}
        className="mb-3 flex items-center gap-2 self-start rounded-full bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary hover:bg-primary/20"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>

      <div
        className="relative flex-1 overflow-y-auto rounded-xl border-l-4 border-sky-500 py-4 pl-10 pr-3"
        style={{
          backgroundImage:
            "linear-gradient(transparent 31px, rgba(0,132,255,0.08) 32px), linear-gradient(90deg, transparent 31px, rgba(0,132,255,0.08) 32px)",
          backgroundSize: "32px 32px",
        }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-1 top-0 w-3 bg-repeat-y"
          style={{
            backgroundImage:
              "radial-gradient(circle at center, white 3px, #64748b 3px, #64748b 4px, transparent 4px)",
            backgroundSize: "100% 28px",
          }}
        />
        <Bookmark aria-hidden="true" className="absolute -top-1 right-4 h-7 w-5 fill-primary text-primary" />

        <div className="space-y-4">
          {messagesQuery.isLoading ? (
            <p className="text-sm text-black/50">Loading…</p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-black/50">No messages yet.</p>
          ) : (
            messages.map((message) => (
              <DiaryEntryCard
                key={message.id}
                message={message}
                courseName={courseName}
                schoolName={schoolName}
                viewerUserId={sessionUserId}
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
  const threadsQuery = useQuery({
    queryKey: ["diary-threads", sessionUserId],
    queryFn: () => getDiaryThreadList({ sessionUserId }),
    enabled: Boolean(sessionUserId),
    refetchOnWindowFocus: false,
  });
  const threads = threadsQuery.data?.details?.threads || [];
  const [selectedThreadId, setSelectedThreadId] = useState(null);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-md flex-col bg-white shadow-xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute -left-4 cursor-pointer top-3 flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white shadow-md hover:bg-red-700"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
          <NotebookText className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 className="text-base font-extrabold text-black">Student Diary</h2>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {selectedThreadId ? (
            <ThreadView
              threadId={selectedThreadId}
              sessionUserId={sessionUserId}
              schoolName={schoolName}
              onBack={() => setSelectedThreadId(null)}
            />
          ) : threadsQuery.isLoading ? (
            <p className="text-sm text-black/50">Loading…</p>
          ) : (
            <ThreadList threads={threads} onSelect={setSelectedThreadId} />
          )}
        </div>
      </div>
    </div>
  );
}
