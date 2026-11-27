"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useDummyStudent } from "@/hooks/useDummyStudent";
import { getSpecialHelpStatus, requestSpecialHelp } from "@/services/dashboardApi";

const SEEN_PREFIX = "is-special-help-seen:";

function readSeen(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSeen(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // storage blocked: the banner may show again, nothing else depends on it
  }
}

/**
 * Special help gate for the signed-in student. state: "N" off, "R" requested, "Y" on, null when unknown
 * (not a student, demo mode or the backend could not be reached) - the panel only locks on "N" / "R".
 * justEnabled: the student last saw it requested and it is on now (shows the "now on" banner once).
 */
export function useSpecialHelp() {
  const { context } = useDashboardContext();
  const { schoolUUID, userId } = context ?? {};
  const dummy = useDummyStudent();
  const queryClient = useQueryClient();
  const queryKey = ["special-help", schoolUUID, userId];
  const query = useQuery({
    queryKey,
    queryFn: () => getSpecialHelpStatus({ schoolUUID, userId }),
    enabled: Boolean(schoolUUID && userId) && dummy.settled && !dummy.enabled,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
  const details = query.data?.status === "1" ? query.data.details : null;
  const state = details?.specialHelp ?? null;

  const [seenBefore] = useState(() => (userId ? readSeen(SEEN_PREFIX + userId) : null));
  const justEnabled = state === "Y" && seenBefore === "R";
  useEffect(() => {
    if (userId && state) writeSeen(SEEN_PREFIX + userId, state);
  }, [userId, state]);

  async function send({ tools, reason, condition }) {
    const answer = await requestSpecialHelp({ schoolUUID, userId, tools, reason, condition });
    if (answer?.status === "1") {
      queryClient.setQueryData(queryKey, answer);
      return { ok: true, routedTo: answer.details?.routedTo || "" };
    }
    return { ok: false, message: answer?.message || "We could not send your request. Please try again." };
  }

  return {
    loading: query.isLoading,
    state,
    locked: state === "N" || state === "R",
    requestedAt: details?.requestedAt || "",
    justEnabled,
    send,
  };
}
