"use client";

import { useState } from "react";
import { CalendarClock, MessageCircle, Megaphone, NotebookText, Wallet, X } from "lucide-react";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useParentChildFees } from "@/hooks/parent/useParentHome";
import { useParentRailCounts } from "@/hooks/parent/useParentRailCounts";
import { RAIL_OPEN_EVENT } from "@/components/dashboard/RightActionRail";
import { UpcomingSchedule } from "@/components/parent/home/UpcomingSchedule";
import { PaymentsDueCard } from "@/components/parent/home/PaymentsDueCard";
import { buildChatSignInUrl } from "@/utils/chatLink";
import { duePayments } from "@/utils/parentHome";

/**
 * The phone bottom bar (legacy .mobileBottomNav): Upcoming classes and Payments slide up as sheets, Announcement and
 * Diary open the rail's panels, Chat opens the chat app. Below 640px only: there the right rail and the two home
 * cards are hidden, wider screens show the cards on the page and the rail on the right.
 */
export function ParentMobileBar({ withClass }) {
  const { context } = useDashboardContext();
  const [sheet, setSheet] = useState(null);
  const { rows } = useParentChildFees();
  const { newAnnouncements, unreadDiary } = useParentRailCounts();
  const feeCount = duePayments(rows).length;

  const openRail = (panel) => window.dispatchEvent(new CustomEvent(RAIL_OPEN_EVENT, { detail: panel }));
  const openChat = () => {
    const url = buildChatSignInUrl({ chatUrl: context?.chatUrl, uniqueId: context?.uniqueId, deploymentMode: process.env.NEXT_PUBLIC_DEPLOYMENT_MODE });
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <div className="h-16 sm:hidden" aria-hidden="true" />
      <nav aria-label="Parent quick actions" className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-slate-200 bg-white px-1 pb-[max(6px,env(safe-area-inset-bottom))] pt-1.5 sm:hidden">
        <BarButton label="Upcoming classes" onClick={() => setSheet("upcoming")} Icon={CalendarClock} />
        <BarButton label="Payments" onClick={() => setSheet("payments")} Icon={Wallet} badge={feeCount} />
        <BarButton label="Announcements" onClick={() => openRail("announcements")} Icon={Megaphone} badge={newAnnouncements} />
        <BarButton label="Student diary" onClick={() => openRail("diary")} Icon={NotebookText} badge={unreadDiary} />
        {context?.chatUrl && <BarButton label="Chat" onClick={openChat} Icon={MessageCircle} />}
      </nav>

      {sheet && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <div className="absolute inset-0 bg-black/40" aria-hidden="true" onClick={() => setSheet(null)} />
          <div role="dialog" aria-modal="true" aria-label={sheet === "upcoming" ? "Upcoming classes and activities" : "Due and upcoming payments"} className="absolute inset-x-0 bottom-0 max-h-[75vh] overflow-y-auto rounded-t-2xl bg-slate-50 p-3">
            <button type="button" aria-label="Close" onClick={() => setSheet(null)} className="mb-2 ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-white shadow">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
            {sheet === "upcoming" ? <UpcomingSchedule withClass={withClass} /> : <PaymentsDueCard />}
          </div>
        </div>
      )}
    </>
  );
}

function BarButton({ label, onClick, Icon, badge }) {
  return (
    <button type="button" onClick={onClick} aria-label={badge ? `${label}, ${badge}` : label} className="relative flex h-11 w-11 items-center justify-center rounded-lg text-black hover:bg-slate-100">
      <Icon className="h-6 w-6" aria-hidden="true" />
      {badge ? (
        <span aria-hidden="true" className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">{badge}</span>
      ) : null}
    </button>
  );
}
