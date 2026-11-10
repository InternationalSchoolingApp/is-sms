"use client";

import { useMutation } from "@tanstack/react-query";
import { saveClubRequest } from "@/services/dashboardApi";

/**
 * Club page "Register Now" — legacy clubsCommon.js applyForClub(). Module rights come from
 * useModuleRights, as for every other module page.
 */
export function useClubModule({ schoolUUID, userId }) {
  const register = useMutation({
    mutationFn: (clubName) => saveClubRequest({ schoolUUID, userId, clubName }),
  });

  return { register };
}
