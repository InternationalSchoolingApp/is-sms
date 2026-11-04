"use client";

import { useState } from "react";
import { Megaphone } from "lucide-react";
import { AnnouncementDetailModal } from "@/components/dashboard/AnnouncementDetailModal";
import { formatRelativeAgo } from "@/components/dashboard/AnnouncementsPanel";
import { EmptyNote, K5Drawer } from "@/components/k5/panels/K5Drawer";

/** K–5 look of the Announcements drawer (mockup "Announcement"): same data, big cards instead of a list. */
export function K5AnnouncementsPanel({ announcements, newCount, schoolUUID, userId, onClose }) {
  const [selected, setSelected] = useState(null);
  return (
    <>
      {!selected && (
        <K5Drawer
          title="Announcements"
          subtitle={newCount > 0 ? `${newCount} new` : "All read"}
          icon={<Megaphone className="h-[30px] w-[30px] text-[#0B2447]" aria-hidden="true" />}
          accent="#1477F8"
          pastel="#D3E7FF"
          bg="var(--k5-card)"
          bodyClassName="px-4 pb-6 pt-[18px] overflow-y-auto"
          onClose={onClose}
        >
        {announcements.length === 0 ? (
          <EmptyNote>No announcements yet.</EmptyNote>
        ) : (
          announcements.map((item) => {
            const isNew = item.seenStatus !== "Y";
            return (
              <article
                key={item.announcementId}
                className="flex gap-3 rounded-[22px] border-[3px] border-[#1477F8] p-3.5 shadow-[0_4px_0_#1477F8]"
                style={{ background: isNew ? "#EAF3FF" : "var(--k5-card)" }}
              >
                <span aria-hidden="true" className="flex h-[54px] w-[54px] flex-none items-center justify-center rounded-2xl bg-[#D3E7FF]">
                  <Megaphone className="h-7 w-7 text-[#0B5ED7]" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {isNew && <span className="rounded-full bg-k5-red px-2.5 py-0.5 text-xs font-black text-white">New</span>}
                    {/* Dummy-mode club announcements carry their own label ("upcoming", "last week"). */}
                    <span className="ms-auto text-[13px] font-extrabold text-k5-mut">{item.timeLabel || formatRelativeAgo(item.createdDate)}</span>
                  </div>
                  <h3 className="m-0 font-k5-display text-[19px] font-semibold leading-tight text-k5-ink">{item.announceTitle}</h3>
                  <button
                    type="button"
                    onClick={() => setSelected(item)}
                    className="min-h-11 w-fit cursor-pointer rounded-full border-none bg-[#1477F8] px-4 text-[15px] font-black text-white shadow-[0_3px_0_#0B5ED7]"
                  >
                    Read more
                  </button>
                </div>
              </article>
            );
          })
        )}
        </K5Drawer>
      )}
      {selected && <AnnouncementDetailModal announcement={selected} schoolUUID={schoolUUID} userId={userId} onClose={() => setSelected(null)} />}
    </>
  );
}
