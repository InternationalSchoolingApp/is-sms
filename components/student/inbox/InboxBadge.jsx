"use client";

import { useInboxUnread } from "@/hooks/useInbox";

/** True for the Inbox menu item and for the group (Communication) that holds it. */
export const isInboxMenuItem = (item) => item?.segment === "inbox" || Boolean(item?.children?.some((child) => child.segment === "inbox"));

/**
 * Unread count on the Inbox / Communication menu item (existing page: refreshInboxBadge) — emails, notifications and
 * announcements of the last 30 days, "99+" above 99, nothing at zero. Mounted only next to an inbox menu item, so
 * a student without the Inbox right never asks for the count.
 */
export function InboxBadge({ className = "" }) {
  const { TOTAL } = useInboxUnread();
  if (!TOTAL) return null;
  return (
    <span className={`flex h-[20px] min-w-[20px] items-center justify-center rounded-full bg-[#d7263d] px-1 text-[11px] font-black leading-none text-white ${className}`}>
      {TOTAL > 99 ? "99+" : TOTAL}
      <span className="sr-only"> unread</span>
    </span>
  );
}
