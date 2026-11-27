"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSettingsByTypeAndKeys } from "@/services/settingsApi";
import { callServer } from "@/utils/serverCall";
import { FEEDBACK_SETTING_KEYS } from "@/utils/classFeedback";
import { viaTier3 } from "@/utils/dashboardBootstrap";

/**
 * Several CONFIGURATION settings of the class feedback flow in ONE round trip (the server runs the reads side by side), instead
 * of one queued server action per setting. Each answer is also stored under the cache entry of hooks/useFeedbackSetting.js
 * (["feedback-setting", userId, key]), so a single-setting reader elsewhere finds it already loaded.
 * Returns { values: { [key]: string | null }, isLoading } - null while loading or when a setting could not be read.
 */
export function useFeedbackSettings(keys, { userId, enabled = true } = {}) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["feedback-settings", userId, ...keys],
    queryFn: async () => {
      // The class feedback host's five keys come with the popup batch (tier 3); any other set is asked for directly.
      const sameKeys = keys.join() === FEEDBACK_SETTING_KEYS.join();
      const ask = () => getSettingsByTypeAndKeys("CONFIGURATION", keys);
      const answers = await callServer(() => (sameKeys ? viaTier3(userId, "feedback", (a) => a.feedback, ask) : ask()));
      keys.forEach((key) => {
        if (typeof answers[key] === "string") queryClient.setQueryData(["feedback-setting", userId, key], answers[key]);
      });
      return answers;
    },
    enabled: Boolean(userId) && enabled,
    staleTime: 10 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const values = {};
  keys.forEach((key) => {
    values[key] = typeof query.data?.[key] === "string" ? query.data[key] : null;
  });
  return { values, isLoading: query.isLoading };
}
