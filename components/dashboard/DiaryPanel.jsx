"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ArrowLeft, NotebookText, Send, X } from "lucide-react";
import {
  getDiaryThreadList,
  getDiaryThreadMessages,
  markDiaryThreadRead,
  replyToDiaryThread,
} from "@/services/diaryApi";

function formatWhen(value) {
  if (!value) return "";
  const parsed = parseISO(String(value));
  return Number.isNaN(parsed.getTime()) ? "" : format(parsed, "MMM d, h:mm a");
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

function ThreadView({ threadId, sessionUserId, onBack }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

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
  const threadStatus = messagesQuery.data?.details?.threadStatus;
  const closed = threadStatus === "CLOSED";

  const handleSend = async () => {
    const message = draft.trim();
    if (!message) return;
    setSending(true);
    const result = await replyToDiaryThread({ sessionUserId, threadId, message });
    setSending(false);
    if (result?.status === "1" || result?.status === 1) {
      setDraft("");
      queryClient.invalidateQueries({ queryKey: ["diary-thread-messages", sessionUserId, threadId] });
      queryClient.invalidateQueries({ queryKey: ["diary-threads", sessionUserId] });
    }
  };

  return (
    <div className="flex h-full flex-col">
      <button
        type="button"
        onClick={onBack}
        className="mb-3 flex items-center gap-2 self-start rounded-full bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary hover:bg-primary/20"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>

      <div className="flex-1 space-y-3 overflow-y-auto">
        {messagesQuery.isLoading ? (
          <p className="text-sm text-black/50">Loading…</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-black/50">No messages yet.</p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`max-w-[85%] rounded-lg p-2 text-sm ${msg.senderUserId === sessionUserId ? "ml-auto bg-primary/10" : "bg-black/5"}`}>
              <div className="flex items-center gap-2 text-xs font-bold text-black/70">
                <span>{msg.senderName}</span>
                <span className="font-normal text-black/40">{formatWhen(msg.createdAt)}</span>
              </div>
              <p className="mt-1 text-black">{msg.message}</p>
            </div>
          ))
        )}
      </div>

      {closed ? (
        <p className="mt-3 text-center text-xs text-black/50">This conversation is closed.</p>
      ) : (
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type a message…"
            className="flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm text-black"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !draft.trim()}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary text-white disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Slide-in "Student Diary" panel — the legacy School Diary teacher<->student
 * messaging thread system. Students can read, reply and mark-read; threads
 * are created by teachers only.
 */
export function DiaryPanel({ sessionUserId, onClose }) {
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const threadsQuery = useQuery({
    queryKey: ["diary-threads", sessionUserId],
    queryFn: () => getDiaryThreadList({ sessionUserId }),
    enabled: Boolean(sessionUserId),
    refetchOnWindowFocus: false,
  });
  const threads = threadsQuery.data?.details?.threads || [];

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
            <ThreadView threadId={selectedThreadId} sessionUserId={sessionUserId} onBack={() => setSelectedThreadId(null)} />
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
