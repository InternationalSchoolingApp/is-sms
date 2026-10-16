"use client";

import { useState } from "react";
import { parseISO } from "date-fns";
import { Megaphone, X } from "lucide-react";
import { AnnouncementDetailModal } from "@/components/dashboard/AnnouncementDetailModal";

function formatRelativeAgo(value) {
  if (!value) return "";
  const date = parseISO(String(value).replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return "";
  const totalMinutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  const totalDays = Math.floor(totalMinutes / (60 * 24));

  if (totalDays >= 30) {
    const months = Math.floor(totalDays / 30);
    const days = totalDays % 30;
    return `${months} month${months === 1 ? "" : "s"} ${days} day${days === 1 ? "" : "s"} ago`;
  }
  if (totalDays > 0) {
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    return `${totalDays} day${totalDays === 1 ? "" : "s"} ${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  const hours = Math.floor(totalMinutes / 60);
  if (hours > 0) {
    const minutes = totalMinutes % 60;
    return `${hours} hour${hours === 1 ? "" : "s"} ${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }
  return `${totalMinutes} minute${totalMinutes === 1 ? "" : "s"} ago`;
}

/**
 * Slide-in announcements panel opened from the right action rail's
 * Megaphone button — the legacy "Announcement(s)" drawer: title + unread
 * count badge, a list of items each with a New badge, a relative-time
 * stamp and a "Learn More" link that opens the full body.
 */
export function AnnouncementsPanel({ announcements, newCount, onClose }) {
  const [selected, setSelected] = useState(null);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-md flex-col bg-white shadow-xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute -left-3 -top-3 flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white shadow-md hover:bg-red-700"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
          <Megaphone className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 className="text-base font-extrabold text-black">Announcement(s)</h2>
          {newCount > 0 && <span className="ml-auto text-sm font-bold text-red-600">{newCount} New</span>}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {announcements.length === 0 ? (
            <p className="text-sm text-black/50">No announcements yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {announcements.map((item) => (
                <li key={item.announcementId} className="py-3">
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-black">{item.announceTitle}</span>
                    {item.seenStatus !== "Y" && (
                      <span className="flex-shrink-0 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">New</span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-black/50">{formatRelativeAgo(item.createdDate)}</p>
                  <button
                    type="button"
                    onClick={() => setSelected(item)}
                    className="mt-1 text-xs font-bold text-primary hover:underline"
                  >
                    Learn More →
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {selected && <AnnouncementDetailModal announcement={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
