"use client";

import { MessageCircle, Megaphone, Newspaper, NotebookText } from "lucide-react";
import toast from "react-hot-toast";

/**
 * Fixed right-edge floating action rail — mirrors the legacy student dashboard:
 * Talk to Us (chat), Announcement, News, Student Diary.
 *
 * These are data/integration-driven in the legacy app (chat URL, announcement &
 * news counts, student diary). They are rendered here to match the reference;
 * the actions are wired as "coming soon" toasts until the backing data/links are
 * threaded through the dashboard context (Phase B / menu endpoint). Pass `chatUrl`
 * and the `*Count` props from context once available to light them up.
 */
export function RightActionRail({ chatUrl, announcementCount, newsCount }) {
  const soon = (label) => () => {
    if (label === "Talk to Us" && chatUrl) {
      window.open(chatUrl, "_blank", "noopener,noreferrer");
      return;
    }
    toast(`${label} — coming soon`, { icon: "🚧" });
  };

  return (
    <div className="fixed right-0 top-1/2 z-40 flex -translate-y-1/2 flex-col items-center gap-3 pr-2">
      <RailButton label="Talk to Us" onClick={soon("Talk to Us")} className="bg-green-600 hover:bg-green-700">
        <MessageCircle className="h-5 w-5" />
      </RailButton>
      <RailButton label="Announcement" onClick={soon("Announcement")} badge={announcementCount}>
        <Megaphone className="h-5 w-5" />
      </RailButton>
      <RailButton label="News" onClick={soon("News")} badge={newsCount}>
        <Newspaper className="h-5 w-5" />
      </RailButton>
      <RailButton label="Student Diary" onClick={soon("Student Diary")}>
        <NotebookText className="h-5 w-5" />
      </RailButton>
    </div>
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
