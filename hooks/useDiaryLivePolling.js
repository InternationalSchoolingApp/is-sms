"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getDiaryBadgeVersion } from "@/utils/diaryClient";

/*
 * Live diary updates by polling - legacy parentSchoolDiary.js diaryRealtimeStart / diaryRealtimePoll:
 * GET /api/diary/badge-version gives a number that moves whenever this person's diary changes (an unchanged answer is a
 * bodiless 304 for the ETag we send back). What is on screen is re-read only when the number moved. It polls only while the
 * tab is visible, about every 60 s with up to 15 s of jitter so tabs do not line up, at once when the tab comes back after
 * a minute away, and backs off (2x, up to 5 min) after errors. The first answer is only the baseline. A burst of changes
 * costs one refresh (300 ms debounce). Not used for a demo (dummy) student.
 *
 * One poller per person for the whole page (legacy: DIARY_RT.started): the rail can mount more than once (skeleton -> page,
 * desktop <-> mobile), and every mount must share the one timer instead of starting its own.
 */
const POLL_MS = 60000;
const JITTER_MS = 15000;
const MAX_BACKOFF_MS = 300000;

const pollers = new Map(); // userId -> { refs, stop }

function startPoller(userId, account, queryClient) {
  const state = { version: null, etag: null, timer: null, apply: null, inFlight: false, failures: 0, lastPollAt: 0, stopped: false };

  const schedule = (delay) => {
    clearTimeout(state.timer);
    state.timer = setTimeout(poll, delay);
  };
  const nextDelay = () => (state.failures > 0 ? Math.min(MAX_BACKOFF_MS, POLL_MS * 2 ** (state.failures - 1)) : POLL_MS + Math.floor(Math.random() * JITTER_MS));

  // The badge, the thread list and every open conversation are re-read (queries nobody is showing just go stale).
  const refresh = () => {
    clearTimeout(state.apply);
    state.apply = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ["diary-unread-count", userId] });
      queryClient.invalidateQueries({ queryKey: ["diary-threads", userId] });
      queryClient.invalidateQueries({ queryKey: ["diary-thread-messages", userId] });
    }, 300);
  };

  async function poll() {
    if (state.stopped || state.inFlight || document.visibilityState === "hidden") return;
    state.inFlight = true;
    state.lastPollAt = Date.now();
    try {
      const answer = await getDiaryBadgeVersion({ account, etag: state.etag });
      if (state.stopped) return;
      if (answer?.status === 304) {
        state.failures = 0;
      } else if (answer?.status === 200) {
        state.failures = 0;
        const version = answer.version != null ? String(answer.version) : null;
        if (version !== null) {
          const changed = state.version !== null && state.version !== version;
          state.version = version;
          state.etag = answer.etag || state.etag;
          if (changed) refresh();
        }
      } else {
        state.failures += 1;
      }
    } catch {
      state.failures += 1;
    } finally {
      state.inFlight = false;
      if (!state.stopped && document.visibilityState !== "hidden") {
        const delay = nextDelay();
        schedule(delay);
      }
    }
  }

  const onVisibility = () => {
    if (document.visibilityState === "hidden") {
      // Nothing runs in a hidden tab; the next poll happens when it comes back.
      clearTimeout(state.timer);
      return;
    }
    const since = Date.now() - state.lastPollAt;
    schedule(since >= POLL_MS ? 0 : POLL_MS - since);
  };

  document.addEventListener("visibilitychange", onVisibility);
  poll();
  return () => {
    state.stopped = true;
    clearTimeout(state.timer);
    clearTimeout(state.apply);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}

export function useDiaryLivePolling({ userId, account, enabled }) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !userId) return undefined;
    // One key for "24796" and 24796: the rail can get the id as a string in one mount and a number in another.
    const key = String(userId);
    let poller = pollers.get(key);
    if (!poller) {
      poller = { refs: 0, stop: startPoller(userId, account, queryClient) };
      pollers.set(key, poller);
    }
    poller.refs += 1;
    return () => {
      poller.refs -= 1;
      // A remount (skeleton -> page) releases and takes it again in the same tick: only stop when nobody holds it any more.
      setTimeout(() => {
        if (poller.refs <= 0 && pollers.get(key) === poller) {
          poller.stop();
          pollers.delete(key);
        }
      }, 0);
    };
  }, [enabled, userId, account, queryClient]);
}
