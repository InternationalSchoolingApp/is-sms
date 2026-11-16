"use client";

import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  createTeacherDemoMeeting,
  discardTeacherDemoAttempt,
  getTeacherDemoPlaybackUrl,
  getTeacherDemoRecordings,
  getTeacherDemoTranscript,
  startTeacherDemoMeeting,
} from "@/services/teacherSignupApi";
import {
  DEMO_POLL_MAX_MS,
  buildCreateDemoMeetingRequest,
  buildStartDemoMeetingRequest,
  hasPendingDemoAttempt,
  isSafeMeetingUrl,
  mapDemoRecordings,
  nextDemoPollInterval,
} from "@/utils/teacherDemoRecording";

export const TEACHER_DEMO_QUERY_KEY = "teacher-demo-recordings";

const GENERIC_ERROR = "Something went wrong. Please try again.";
const STATUS_SESSION_OUT = "3";

/**
 * The teacher's demo attempts, kept up to date while one is unfinished: every 10 s while a meeting is running or its
 * recording is being made (and while a meeting just started has not shown up yet), paused while the tab is hidden,
 * refreshed when the teacher comes back to it, and given up on after 40 minutes (`stalled`, with `refresh()` to look
 * again). Reloading the page picks the watching up again by itself: an unfinished attempt is enough.
 *
 * Returns the query plus: watch() = "a meeting was just started, wait for it to appear", refresh(), stalled.
 */
export function useTeacherDemoRecordings({ context, userId, enabled }) {
  const [awaitingAfter, setAwaitingAfter] = useState(null);
  const [watchStartedAt, setWatchStartedAt] = useState(() => Date.now());
  const [stalled, setStalled] = useState(false);

  const query = useQuery({
    queryKey: [TEACHER_DEMO_QUERY_KEY, userId],
    queryFn: async () => {
      const mapped = mapDemoRecordings(
        await getTeacherDemoRecordings(context.schoolUUID, { userId, schoolId: context.schoolNumericId })
      );
      if (!mapped) throw new Error("Could not load the demo recordings");
      return mapped;
    },
    enabled: Boolean(enabled && context?.schoolUUID && userId),
    staleTime: 0,
    gcTime: 0,
    retry: 1,
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: false,
    refetchInterval: (current) =>
      nextDemoPollInterval({
        attempts: current.state.data?.attempts,
        elapsedMs: Date.now() - watchStartedAt,
        awaitingAfter,
      }),
  });

  const attempts = query.data?.attempts;
  // The meeting just started has shown up: from here on the attempt's own state says whether to keep watching.
  if (awaitingAfter !== null && (attempts?.length ?? 0) > awaitingAfter) {
    setAwaitingAfter(null);
  }
  const watching = hasPendingDemoAttempt(attempts) || (awaitingAfter !== null && (attempts?.length ?? 0) <= awaitingAfter);

  // When the 40 minutes run out while still watching, say so (the interval itself just stops).
  useEffect(() => {
    if (!watching) return undefined;
    const remaining = Math.max(0, DEMO_POLL_MAX_MS - (Date.now() - watchStartedAt));
    const timer = setTimeout(() => setStalled(true), remaining);
    return () => clearTimeout(timer);
  }, [watching, watchStartedAt]);

  const restartWatching = useCallback(() => {
    setWatchStartedAt(Date.now());
    setStalled(false);
  }, []);

  const watch = useCallback(
    (attemptCount) => {
      setAwaitingAfter(attemptCount);
      restartWatching();
    },
    [restartWatching]
  );

  const refresh = useCallback(() => {
    restartWatching();
    return query.refetch();
  }, [query, restartWatching]);

  return { ...query, watch, refresh, stalled: stalled && watching };
}

/**
 * Create the demo meeting (the server fixes the time and counts the attempt) and get the Lens host link for it:
 *   { ok: true, hostUrl, title, reused } | { ok: false, message } | { ok: false, sessionOut: true }
 */
export function useStartTeacherDemo({ context, userId }) {
  return useMutation({
    // reattempt = the meeting replaces one the teacher just removed (only changes its title, "Re-Attempt N")
    mutationFn: async ({ reattempt = false } = {}) => {
      const created = await createTeacherDemoMeeting(
        context.schoolUUID,
        buildCreateDemoMeetingRequest({ userId, schoolNumericId: context.schoolNumericId, reattempt })
      );
      if (!created) return { ok: false, message: GENERIC_ERROR };
      if (created.status !== "success" || !created.data?.meetingId) {
        return { ok: false, message: created.message || GENERIC_ERROR };
      }
      const started = await startTeacherDemoMeeting(
        context.schoolUUID,
        buildStartDemoMeetingRequest({ meetingId: created.data.meetingId, userId })
      );
      if (!started) return { ok: false, message: GENERIC_ERROR };
      if (String(started.status) === STATUS_SESSION_OUT) return { ok: false, sessionOut: true };
      if (String(started.status) !== "1" || !isSafeMeetingUrl(started.redirectUrl)) {
        return { ok: false, message: started.message || GENERIC_ERROR };
      }
      // reused = the teacher's earlier meeting that has not ended yet, handed back instead of a new one
      return { ok: true, hostUrl: started.redirectUrl, title: created.data.title || "", reused: created.data.meetingsExist === true };
    },
  });
}

export function useDiscardTeacherDemoAttempt({ context }) {
  return useMutation({
    mutationFn: async (sessionId) => {
      const answer = await discardTeacherDemoAttempt(context.schoolUUID, sessionId);
      return answer?.statusCode === "SUCCESS";
    },
  });
}

/** { url } of a recording the teacher may play, or { message }. */
export function useTeacherDemoPlayback({ context }) {
  return useMutation({
    mutationFn: (recordingUrl) => getTeacherDemoPlaybackUrl(context.schoolUUID, recordingUrl),
  });
}

/** { content } (the transcript text) of one of the teacher's recordings, or { message }. */
export function useTeacherDemoTranscript({ context }) {
  return useMutation({
    mutationFn: (recordingUrl) => getTeacherDemoTranscript(context.schoolUUID, recordingUrl),
  });
}
