"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Megaphone } from "lucide-react";
import { getAnnouncementDetails } from "@/services/dashboardApi";
import { AnnouncementDetailModal, formatAnnouncementDate } from "@/components/dashboard/AnnouncementDetailModal";

/**
 * Recent school announcements (legacy announcement.js / getAnnouncementDatails).
 * Shows the latest few titles; clicking one opens the full HTML body via
 * AnnouncementDetailModal.
 */
export function AnnouncementsWidget({ schoolUUID, userId }) {
  const [selected, setSelected] = useState(null);
  const query = useQuery({
    queryKey: ["student-announcements", schoolUUID, userId],
    queryFn: () => getAnnouncementDetails({ schoolUUID, userId, startFrom: 0, pageSize: 5 }),
    enabled: Boolean(schoolUUID && userId),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const announcements = query.data?.announcements || [];
  if (!query.isLoading && announcements.length === 0) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2">
        <Megaphone className="h-4 w-4 text-primary" aria-hidden="true" />
        <h2 className="text-sm font-extrabold text-black">Announcements</h2>
      </div>
      {query.isLoading ? (
        <p className="mt-3 text-sm text-black/60">Loading announcements…</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {announcements.map((item) => (
            <li key={item.announcementId}>
              <button
                type="button"
                onClick={() => setSelected(item)}
                className="block w-full rounded-lg border border-slate-100 px-3 py-2 text-left hover:border-primary hover:bg-primary/5"
              >
                <span className="block truncate text-sm font-semibold text-black">{item.announceTitle}</span>
                <span className="text-xs text-black/50">{formatAnnouncementDate(item.createdDate)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <AnnouncementDetailModal announcement={selected} schoolUUID={schoolUUID} userId={userId} onClose={() => setSelected(null)} />
      )}
    </section>
  );
}
