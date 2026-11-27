"use client";

import { useEffect, useState } from "react";
import { useParentChildSchedule } from "@/hooks/parent/useParentHome";
import { useSelectedChild } from "@/hooks/parent/useSelectedChild";
import { clockInZone, scheduleBadge, wallTimeToDate } from "@/utils/parentHome";
import { firstName } from "@/components/parent/childLabels";

const seenKey = (childId, itemId) => `is-parent-live-popup:${childId}:${itemId}`;

function wasSeen(key) {
  try {
    return window.sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function markSeen(key) {
  try {
    window.sessionStorage.setItem(key, "1");
  } catch {
    // storage unavailable: the popup may show again after a reload
  }
}

/**
 * "Class is live now" popup (design board): when the selected child has a class running, tell the parent to remind the
 * child to join from the student dashboard. Once per live class per tab. Esc, the close button, a click outside or the
 * Okay button close it.
 */
export function LiveClassPopup() {
  const { selectedChild } = useSelectedChild();
  const { schedule, timeZone } = useParentChildSchedule();
  const [now, setNow] = useState(() => new Date());
  const [closedKey, setClosedKey] = useState(null);
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);

  const live = schedule.find((item) => scheduleBadge(item, now)?.tone === "live");
  const key = live && selectedChild ? seenKey(selectedChild.userId, live.id) : null;
  const open = Boolean(key) && closedKey !== key && !wasSeen(key);

  const close = () => {
    if (!key) return;
    markSeen(key);
    setClosedKey(key);
  };

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, key]);

  if (!open) return null;
  const first = firstName(selectedChild.studentName);
  const name = live.courseName || live.entityName;
  const start = wallTimeToDate(live.start, live.timezone);
  const end = wallTimeToDate(live.end, live.timezone);

  return (
    <div className="lv-back" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="lv" role="dialog" aria-modal="true" aria-labelledby="pd-lv-h" aria-describedby="pd-lv-p">
        <div className="lv-top">
          <i aria-hidden="true" />
          LIVE NOW
        </div>
        <button className="lv-x" type="button" aria-label="Close" onClick={close}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
        <div className="lv-b">
          <div className="lv-cls">
            <span className="lv-ic" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 5.5C5.5 4 8.5 4 12 6c3.5-2 6.5-2 9-.5V19c-2.5-1.5-5.5-1.5-9 .5-3.5-2-6.5-2-9-.5zM12 6v13.5" />
              </svg>
            </span>
            <div>
              <b>{name}</b>
              {start && end && (
                <span>
                  {clockInZone(start, timeZone)} to {clockInZone(end, timeZone)}
                </span>
              )}
            </div>
          </div>
          <h3 id="pd-lv-h">
            {first}&apos;s {name} class is live now
          </h3>
          <p id="pd-lv-p">Please remind {first} to join the class from the student dashboard.</p>
          <button className="lv-ok" type="button" autoFocus onClick={close}>
            Okay, I&apos;ll remind {first}
          </button>
        </div>
      </div>
    </div>
  );
}
