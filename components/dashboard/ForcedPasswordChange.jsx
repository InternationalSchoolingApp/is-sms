"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChangePasswordModal } from "@/components/dashboard/ChangePasswordModal";
import { K5ChangePasswordModal } from "@/components/k5/panels/K5ChangePasswordModal";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useDummyStudent } from "@/hooks/useDummyStudent";
import { getUserShortProfile } from "@/services/dashboardApi";

/**
 * "You must change your password" on the student dashboard — legacy rendereDashboardContent: one second after the
 * dashboard loads, when the password is due (lastPassUpdatedDate) or a sibling added from enrollment is still on the
 * temporary password (addSiblingFirstLogin), the Change Password popup opens without a way to close it
 * (callCommonDashboardPageForPasswordChange('14','No')).
 *
 * The legacy page read both flags from the dashboard-or-migration answer, which never fills them, so the prompt never
 * showed there; they are taken here from get-user-short-profile, which works them out (CommonUtil.getPasswordPolicy:
 * FORCE_PASSWORD_CHANGE_POLICY_SERVICE on and the password older than PASSWORD_RESET_IN_DAYS, or no policy row yet;
 * CommonUtil.isAddSiblingFirstLogin). Students only (not a parent viewing a child), never in dummy mode.
 */
export function ForcedPasswordChange() {
  const { context, isK5 } = useDashboardContext();
  const dummy = useDummyStudent();
  const queryClient = useQueryClient();
  const schoolUUID = context?.schoolUUID;
  const userId = context?.userId;
  const wanted = Boolean(schoolUUID && userId) && (context?.role || "student") === "student" && dummy.settled && !dummy.enabled;

  // Same cache entry as the Add Siblings button (hooks/useAddSiblings.js).
  const { data: profile } = useQuery({
    queryKey: ["user-short-profile", schoolUUID, userId],
    queryFn: () => getUserShortProfile({ schoolUUID, userId }),
    enabled: wanted,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const due = profile?.lastPassUpdatedDate === true || profile?.addSiblingFirstLogin === true || profile?.addSiblingFirstLogin === "Y";

  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!wanted || !due || done) return undefined;
    const id = setTimeout(() => setOpen(true), 1000);
    return () => clearTimeout(id);
  }, [wanted, due, done]);

  if (!open) return null;
  const close = () => {
    setOpen(false);
    setDone(true);
    queryClient.invalidateQueries({ queryKey: ["user-short-profile", schoolUUID, userId] });
  };
  return isK5 ? <K5ChangePasswordModal forced onClose={close} /> : <ChangePasswordModal forced onClose={close} />;
}
