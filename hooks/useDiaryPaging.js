"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { getDiaryThreadList, getDiaryThreadMessages } from "@/utils/diaryClient";
import { diaryDayLabel } from "@/utils/diaryDates";
import { useDummyStudent } from "@/hooks/useDummyStudent";
import { useDashboardContext } from "@/hooks/useDashboardContext";

/*
 * Paging of the School Diary, as in legacy parentSchoolDiary.js:
 *   - the thread list loads 20 at a time while the list is scrolled to its bottom (getChatUserListRecodrs + the
 *     .user-list-wrapper scroll handler);
 *   - a thread opens on its newest messages (page 0, 20 of them, oldest first) scrolled to the bottom, and the older
 *     ones (page 1, 2, ...) are put in above when the top is reached, keeping the place on the screen (loadOldMessages).
 * Server pages are 0-indexed and each message page is already oldest-first (DiaryChatUtil reverses it), with page 0 the
 * newest. The demo (dummy student) data is a single page.
 */
const PAGE_SIZE = 20;

// The service answers null when the server could not be reached (or refused): that is an error to show with a retry, not an empty diary.
async function orFail(request) {
  const answer = await request;
  if (!answer) throw new Error("The diary could not be loaded");
  return answer;
}

const nextPage = (last, all) => {
  const total = last?.details?.totalPages;
  return typeof total === "number" && all.length < total ? all.length : undefined;
};

/** The student's diary threads, all loaded pages joined. -> { query, threads, sourceTimezone } */
export function useDiaryThreads({ sessionUserId }) {
  const dummy = useDummyStudent();
  const account = useDashboardContext().context?.uniqueId;
  const query = useInfiniteQuery({
    queryKey: ["diary-threads", sessionUserId, dummy.key],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => (dummy.enabled ? dummy.student.diaryThreads() : orFail(getDiaryThreadList({ account, page: pageParam, size: PAGE_SIZE }))),
    getNextPageParam: nextPage,
    retry: 1,
    enabled: Boolean(sessionUserId && dummy.settled),
    refetchOnWindowFocus: false,
  });
  const pages = query.data?.pages || [];
  return {
    query,
    threads: pages.flatMap((page) => page?.details?.threads || []),
    sourceTimezone: pages[0]?.details?.sourceTimezone,
  };
}

/** The messages of one thread, oldest first across every loaded page. -> { query, messages, courseName, sourceTimezone } */
export function useDiaryMessages({ sessionUserId, threadId }) {
  const dummy = useDummyStudent();
  const account = useDashboardContext().context?.uniqueId;
  const query = useInfiniteQuery({
    queryKey: ["diary-thread-messages", sessionUserId, threadId, dummy.key],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => (dummy.enabled ? dummy.student.diaryMessages(threadId) : orFail(getDiaryThreadMessages({ account, threadId, page: pageParam, size: PAGE_SIZE }))),
    getNextPageParam: nextPage,
    retry: 1,
    enabled: Boolean(sessionUserId && threadId && dummy.settled),
    refetchOnWindowFocus: false,
  });
  const pages = query.data?.pages || [];
  return {
    query,
    messages: [...pages].reverse().flatMap((page) => page?.details?.messages || []),
    courseName: pages[0]?.details?.courseName,
    sourceTimezone: pages[0]?.details?.sourceTimezone,
  };
}

/** The nearest ancestor that really scrolls right now (the drawer / panel body around the list). */
export function scrollParent(node) {
  for (let el = node?.parentElement; el; el = el.parentElement) {
    const overflow = getComputedStyle(el).overflowY;
    if ((overflow === "auto" || overflow === "scroll") && el.scrollHeight > el.clientHeight) return el;
  }
  return null;
}

/**
 * Put at the END of a list: when it comes into view the next page is asked for (the thread list). Returns the ref
 * callback for that marker element.
 */
export function useLoadMoreAtEnd({ hasNextPage, isFetchingNextPage, fetchNextPage }) {
  const [node, setNode] = useState(null);
  useEffect(() => {
    if (!node || !hasNextPage || isFetchingNextPage || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) fetchNextPage();
      },
      { rootMargin: "120px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, hasNextPage, isFetchingNextPage, fetchNextPage]);
  return setNode;
}

/**
 * A chat view: opens scrolled to the newest message, asks for the older page when the top is reached and keeps the
 * messages that were on screen in place when they are put in above (legacy gotoChat + loadOldMessages). `anchorRef` is
 * any element inside the scrolling area; `ready` is true once the first page is on screen.
 */
export function useChatScroll(anchorRef, { ready, pageCount, hasNextPage, isFetchingNextPage, fetchNextPage }) {
  const last = useRef({ pages: 0, height: 0 });

  useLayoutEffect(() => {
    if (!ready) return;
    const el = scrollParent(anchorRef.current);
    if (!el) return;
    if (last.current.pages === 0) el.scrollTop = el.scrollHeight;
    else if (pageCount > last.current.pages) el.scrollTop += el.scrollHeight - last.current.height;
    last.current = { pages: pageCount, height: el.scrollHeight };
  }, [ready, pageCount, anchorRef]);

  const loadOlder = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    if (!ready) return undefined;
    const el = scrollParent(anchorRef.current);
    if (!el) {
      // Nothing overflows yet (a short first page on a tall screen): the older page is asked for straight away.
      loadOlder();
      return undefined;
    }
    const onScroll = () => {
      if (el.scrollTop <= 40) loadOlder();
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [ready, pageCount, loadOlder, anchorRef]);
}

/**
 * The floating day label of a chat (legacy updateDateLabel): while the notes are scrolled it names the day of the one at
 * the top (Today, Yesterday, a weekday, "Mon, 02 Nov") and it fades a moment after the scrolling stops. Each message element
 * carries its moment in `data-diary-at` (ms). -> { label, visible }
 */
export function useFloatingDate(anchorRef, { ready, count }) {
  const [state, setState] = useState({ label: "", visible: false });
  useEffect(() => {
    if (!ready) return undefined;
    const el = scrollParent(anchorRef.current);
    if (!el) return undefined;
    let frame = 0;
    let hide = 0;
    const update = () => {
      frame = 0;
      const line = el.getBoundingClientRect().top + 60;
      let found = null;
      for (const node of el.querySelectorAll("[data-diary-at]")) {
        if (node.getBoundingClientRect().top <= line) found = node;
        else break;
      }
      const at = found ? Number(found.dataset.diaryAt) : NaN;
      if (Number.isFinite(at)) setState({ label: diaryDayLabel(new Date(at)), visible: true });
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
      clearTimeout(hide);
      hide = setTimeout(() => setState((previous) => ({ ...previous, visible: false })), 1000);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
      clearTimeout(hide);
    };
  }, [ready, count, anchorRef]);
  return state;
}
