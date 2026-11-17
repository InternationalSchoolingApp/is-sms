"use client";

import { useCallback, useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { submitTeacherProfileForReview } from "@/services/teacherSignupApi";
import { TEACHER_PROCESS_QUERY_KEY } from "@/hooks/useTeacherRegistrationContext";
import { buildAuthenticatedRequest } from "@/utils/authentication";
import { TEACHER_STATUS_POLL_MS } from "@/utils/teacherReview";

const USER_TYPE = "TEACHER";
const STATUS_SUCCESS = "1";
const STATUS_SESSION_OUT = "3";
const GENERIC_ERROR = "Something went wrong. Please try again.";

/**
 * Submit the profile for review (Step 3 "Submit"): { ok: true } | { ok: false, sessionOut: true } | { ok: false, message }.
 * The server moves the teacher to "under review" only from the stage right after the professional details.
 */
export function useSubmitTeacherForReview({ context, userId }) {
  return useMutation({
    mutationFn: async () => {
      const answer = await submitTeacherProfileForReview(context.schoolUUID, {
        authentication: buildAuthenticatedRequest(context, userId, USER_TYPE),
      });
      if (!answer) return { ok: false, message: GENERIC_ERROR };
      if (String(answer.status) === STATUS_SESSION_OUT) return { ok: false, sessionOut: true };
      if (String(answer.status) !== STATUS_SUCCESS) return { ok: false, message: answer.message || GENERIC_ERROR };
      return { ok: true };
    },
  });
}

/**
 * The lock screen's status check (the plan's "Check status", and the 30 s poll): asks the backend again where the
 * teacher belongs, by refetching the wizard's process query (the context and so the screen move on by themselves when
 * the school has approved the profile). The poll skips a hidden tab and looks again as soon as the teacher comes back.
 * Returns { check(), checking }.
 */
export function useTeacherStatusPoll({ enabled }) {
  const queryClient = useQueryClient();
  const [checking, setChecking] = useState(false);

  const check = useCallback(async () => {
    setChecking(true);
    try {
      await queryClient.invalidateQueries({ queryKey: [TEACHER_PROCESS_QUERY_KEY] });
    } finally {
      setChecking(false);
    }
  }, [queryClient]);

  useEffect(() => {
    if (!enabled) return undefined;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") check();
    }, TEACHER_STATUS_POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, check]);

  return { check, checking };
}
