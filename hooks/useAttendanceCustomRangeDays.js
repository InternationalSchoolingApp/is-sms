"use client";

import { useQuery } from "@tanstack/react-query";
import { getNumericSettingByTypeAndKey } from "@/services/settingsApi";
import { callServer } from "@/utils/serverCall";

// The backend's own default when the setting row is missing or blank
// (DashboardParentUtil: getSettingValueByTypeAndKeyAsInt("CONFIGURATION", "ATTENDANCE_CUSTOM_RANGE_DAYS", 60)).
export const DEFAULT_ATTENDANCE_CUSTOM_RANGE_DAYS = 60;

/**
 * How many past days the Custom date filter may reach: CONFIGURATION / ATTENDANCE_CUSTOM_RANGE_DAYS, read from
 * the backend. A configured positive whole number always wins; only when the setting is empty / not set does the
 * backend's default (60) apply, exactly as the backend itself validates it. `days` is null when the setting holds
 * something invalid or could not be read - then Custom stays unavailable instead of allowing any date.
 */
export function useAttendanceCustomRangeDays({ userId, enabled = true }) {
  const query = useQuery({
    queryKey: ["attendance-custom-range-days", userId],
    queryFn: () => callServer(() => getNumericSettingByTypeAndKey("CONFIGURATION", "ATTENDANCE_CUSTOM_RANGE_DAYS")),
    enabled: Boolean(userId) && enabled,
    staleTime: 10 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const setting = query.data;
  const configured = setting && Number.isInteger(setting.value) && setting.value > 0 ? setting.value : null;
  const days = configured ?? (setting?.empty ? DEFAULT_ATTENDANCE_CUSTOM_RANGE_DAYS : null);
  return { days, isLoading: query.isLoading, unavailable: !query.isLoading && days === null };
}
