"use client";

import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import { addActivity, addClassTime, removeActivity, removeClassTime, removeDocument } from "@/services/profileActionsApi";
import { saveMyProfile } from "@/services/profileSaveApi";
import { callingPreferences } from "@/utils/profileEdit";
import { callServer } from "@/utils/serverCall";
import { markSessionExpired } from "@/utils/sessionState";

/**
 * My Profile P3 changes that save straight away, like the existing page: live-class times, parent calling times,
 * joined activities, and documents. Each call shows a toast and reloads the profile. `busy` names the running action
 * (e.g. "time:add", "doc:Age Proof"), so a button can show it is working.
 */
export function useProfileActions({ studentStandardId, refetch, callingSlots = [] }) {
  const [busy, setBusy] = useState(null);

  const run = useCallback(
    async (key, action, done) => {
      if (busy) return false;
      setBusy(key);
      try {
        await action();
        await refetch?.();
        toast.success(done);
        return true;
      } catch (error) {
        toast.error(String(error?.message || "Something went wrong.").replace(/^[A-Z_0-9]+:\s*/, ""));
        return false;
      } finally {
        setBusy(null);
      }
    },
    [busy, refetch],
  );

  const saveCalling = (slots, roles) =>
    callServer(() => saveMyProfile({ studentStandardId, items: [{ keyId: "communicationPreferredSlots", callingPreferences: callingPreferences(slots, roles) }] }));

  return {
    busy,
    addClassTime: (start, end) => run("time:add", () => callServer(() => addClassTime({ start, end })), "Time saved!"),
    removeClassTime: (id) => run(`time:${id}`, () => callServer(() => removeClassTime({ timePrefId: id })), "Time removed."),
    addCallingTime: (role, start, end) => {
      if (callingSlots.some((x) => x.role === role && start < x.end && end > x.start)) {
        toast.error("This time overlaps with another time for the same person.");
        return Promise.resolve(false);
      }
      return run("call:add", () => saveCalling([...callingSlots, { role, start, end }], [role]), "Time saved!");
    },
    removeCallingTime: (index) => {
      const slot = callingSlots[index];
      if (!slot) return Promise.resolve(false);
      return run(`call:${index}`, () => saveCalling(callingSlots.filter((_, i) => i !== index), [slot.role]), "Time removed.");
    },
    addActivity: (values) => run("activity:add", () => callServer(() => addActivity(values)), "Activity added!"),
    removeActivity: (id) => run(`activity:${id}`, () => callServer(() => removeActivity({ id })), "Activity removed."),
    uploadDocument: (docType, file) =>
      run(
        `doc:${docType}`,
        async () => {
          const form = new FormData();
          form.set("docType", docType);
          form.set("file", file);
          const response = await fetch("/api/profile/document", { method: "POST", body: form });
          const body = await response.json().catch(() => null);
          if (response.status === 401 && body?.sessionExpired) markSessionExpired();
          if (!response.ok) throw new Error(body?.message || "The document could not be saved.");
        },
        "Document saved!",
      ),
    removeDocument: (docType) => run(`doc:${docType}`, () => callServer(() => removeDocument({ docType })), "Document removed."),
  };
}
