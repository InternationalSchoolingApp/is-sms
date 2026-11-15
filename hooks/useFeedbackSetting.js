"use client";

import { useQuery } from "@tanstack/react-query";
import { getSettingsByTypeAndKey } from "@/services/settingsApi";
import { callServer } from "@/utils/serverCall";

/**
 * One CONFIGURATION setting of the class feedback flow (utils/classFeedback.js FEEDBACK_SETTING), read from the backend
 * like the legacy getSettingsByTypeAndKey. `value` is the raw text ("" when the setting does not exist) and stays
 * `null` while it is loading or could not be read - the callers treat that as "not configured", as the legacy code did
 * when the call failed.
 */
export function useFeedbackSetting(key, { userId, enabled = true } = {}) {
  const query = useQuery({
    queryKey: ["feedback-setting", userId, key],
    queryFn: () => callServer(() => getSettingsByTypeAndKey("CONFIGURATION", key)),
    enabled: Boolean(userId) && enabled,
    staleTime: 10 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  return { value: typeof query.data === "string" ? query.data : null, isLoading: query.isLoading };
}
