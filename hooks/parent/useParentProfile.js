"use client";

import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { getParentAppInstallEligible, getParentProfile, getParentProfileMaster, saveParentProfile } from "@/services/parentProfileApi";
import { expireSession } from "@/utils/logout";

const GENERIC = "Something went wrong. Please try again.";

/**
 * The signed-in parent's own profile (legacy adminProfileContent.js): the details, a save, and the photo upload.
 * Everything is about the SESSION parent (the services read the id from the session), so there is no user id here.
 * Keys = [feature, school, parent]. status "1" = ok, "3" = session out, anything else is a failed answer
 * (`failed`, with the backend's own message when it sent one); a null answer (network / server) is `failed` too.
 *
 * save(values) -> { ok, message }: values = { userFullName, gender, contactNumber, countryId, stateId, cityId,
 * countryTimezone, countryTimezoneId, isdCode, languageKnown[] }; a saved profile is read again and the header's
 * parent name is refreshed. uploadPhoto(blob) -> { ok, message }.
 */
export function useParentProfile() {
  const { context } = useDashboardContext();
  const queryClient = useQueryClient();
  const schoolUUID = context?.schoolUUID;
  const parentUserId = context?.userId;
  const enabled = Boolean(schoolUUID && parentUserId);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const query = useQuery({
    queryKey: ["parent-profile", schoolUUID, parentUserId],
    queryFn: () => getParentProfile({ schoolUUID }),
    enabled,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const data = query.data;
  const ok = String(data?.status) === "1" && Boolean(data?.details);

  const refreshAfterChange = useCallback(async () => {
    await query.refetch();
    // The header greets the parent by name (hooks/parent/useParentGate.js "parent-name").
    queryClient.invalidateQueries({ queryKey: ["parent-name", schoolUUID, parentUserId] });
  }, [query, queryClient, schoolUUID, parentUserId]);

  const save = useCallback(
    async (values) => {
      if (!enabled) return { ok: false, message: GENERIC };
      setSaving(true);
      try {
        const result = await saveParentProfile({ schoolUUID, values });
        if (!result) return { ok: false, message: GENERIC };
        if (result.sessionOut) {
          expireSession(schoolUUID);
          return { ok: false, message: result.message };
        }
        if (result.ok) await refreshAfterChange();
        return { ok: result.ok, message: result.message || (result.ok ? "Profile Update Successfully" : GENERIC) };
      } catch {
        return { ok: false, message: GENERIC };
      } finally {
        setSaving(false);
      }
    },
    [enabled, schoolUUID, refreshAfterChange],
  );

  const uploadPhoto = useCallback(
    async (blob) => {
      if (!enabled) return { ok: false, message: GENERIC };
      setUploading(true);
      try {
        const form = new FormData();
        form.append("file", blob, "avatar.jpg");
        const response = await fetch("/api/parent/profile-document", { method: "POST", body: form });
        const body = await response.json().catch(() => null);
        if (response.status === 401 && body?.sessionExpired) {
          expireSession(schoolUUID);
          return { ok: false, message: body.message || GENERIC };
        }
        if (!response.ok) return { ok: false, message: body?.message || GENERIC };
        await refreshAfterChange();
        return { ok: true, message: body?.message || "Profile image uploaded successfully" };
      } catch {
        return { ok: false, message: GENERIC };
      } finally {
        setUploading(false);
      }
    },
    [enabled, schoolUUID, refreshAfterChange],
  );

  return {
    schoolUUID,
    schoolNumericId: context?.schoolNumericId,
    parentUserId,
    isLoading: enabled && query.isPending,
    sessionOut: String(data?.status) === "3",
    failed: !query.isPending && !ok && String(data?.status) !== "3",
    failedMessage: data?.message || "",
    details: ok ? data.details : null,
    retry: () => query.refetch(),
    save,
    saving,
    uploadPhoto,
    uploading,
  };
}

/**
 * One dropdown list of the profile form (countries, states of a country, cities of a state, timezones), cached per
 * list. Returns { options: [{ key, value, extra, extra1, extra2, extra3 }], isLoading, failed }.
 */
export function useParentProfileMaster(kind, id, enabled = true) {
  const { context } = useDashboardContext();
  const schoolUUID = context?.schoolUUID;
  const parentUserId = context?.userId;
  const needsId = kind === "states" || kind === "cities";
  const query = useQuery({
    queryKey: ["parent-profile-master", schoolUUID, parentUserId, kind, needsId ? String(id || "") : ""],
    queryFn: async () => {
      const list = await getParentProfileMaster({ schoolUUID, kind, id });
      if (!Array.isArray(list)) throw new Error("The list could not be loaded.");
      return list;
    },
    enabled: Boolean(enabled && schoolUUID && parentUserId && (!needsId || Number(id) > 0)),
    staleTime: 30 * 60_000,
    refetchOnWindowFocus: false,
  });
  return { options: query.data ?? EMPTY, isLoading: query.isFetching && !query.data, failed: query.isError };
}
const EMPTY = [];

/**
 * Should the app-install prompt open for this parent now (legacy initAppInstallNotification gates: the backend says the
 * app is not in use, plus the page-side gates in the component). Key = [feature, school, parent].
 */
export function useParentAppInstallEligible(enabled) {
  const { context } = useDashboardContext();
  const schoolUUID = context?.schoolUUID;
  const parentUserId = context?.userId;
  const query = useQuery({
    queryKey: ["parent-app-install", schoolUUID, parentUserId],
    queryFn: () => getParentAppInstallEligible(),
    enabled: Boolean(enabled && schoolUUID && parentUserId),
    staleTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });
  return query.data === true;
}
