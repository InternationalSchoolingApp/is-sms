"use client";

import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import { addActivity, addClassTime, removeActivity, removeClassTime, removeCustomFile, removeDocument, removeSocialLink } from "@/services/profileActionsApi";
import { saveMyProfile } from "@/services/profileSaveApi";
import { callingPreferences, isValidUrl } from "@/utils/profileEdit";
import { callServer } from "@/utils/serverCall";
import { markSessionExpired } from "@/utils/sessionState";

/**
 * My Profile P3 changes that save straight away, like the existing page: live-class times, parent calling times,
 * joined activities, and documents. Each call shows a toast and reloads the profile. `busy` names the running action
 * (e.g. "time:add", "doc:Age Proof"), so a button can show it is working.
 */
/** Posts { docType, file } pairs to app/api/profile/document (multipart; one save-docs call on the server). */
async function postDocuments(list, extra = {}) {
  const form = new FormData();
  for (const { docType, file } of list) {
    form.append("docType", docType);
    form.append("file", file);
  }
  Object.entries(extra).forEach(([k, v]) => form.set(k, String(v)));
  const response = await fetch("/api/profile/document", { method: "POST", body: form });
  const body = await response.json().catch(() => null);
  if (response.status === 401 && body?.sessionExpired) markSessionExpired();
  if (!response.ok) throw new Error(body?.message || "The document could not be saved.");
}

// The existing page allows three preferred times per list (profileViewNew.js addClassPreferredTime /
// addCommunicationPreferredTime).
const MAX_TIMES = 3;

export function useProfileActions({ studentStandardId, refetch, callingSlots = [], classSlots = [], socialLinks = [] }) {
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
    refetch,
    addClassTime: (start, end) => {
      if (classSlots.length >= MAX_TIMES) {
        toast.error("A maximum of three preferred live class timings can be added.");
        return Promise.resolve(false);
      }
      return run("time:add", () => callServer(() => addClassTime({ start, end })), "Time saved!");
    },
    removeClassTime: (id) => run(`time:${id}`, () => callServer(() => removeClassTime({ timePrefId: id })), "Time removed."),
    addCallingTime: (role, start, end) => {
      if (callingSlots.filter((x) => x.role === role).length >= MAX_TIMES) {
        toast.error(`A maximum of three preferred communication timings can be added. ${role}`);
        return Promise.resolve(false);
      }
      if (callingSlots.some((x) => x.role === role && x.start === start && x.end === end)) {
        toast.error("This time is already added.");
        return Promise.resolve(false);
      }
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
      run(`doc:${docType}`, () => postDocuments([{ docType, file }]), docType === "Profile Image" ? "Your new photo is saved!" : "Document saved!"),
    // Documents section "Save Documents": every chosen proof in one save-docs call, like the existing page.
    uploadDocuments: (list) => run("doc:save", () => postDocuments(list), list.length > 1 ? "Documents saved!" : "Document saved!"),
    // "Add other social media link" (profileViewNew.js addOtherSocialLinks): saved as socialMedia "0~url~title".
    addSocialLink: (title, url) => {
      const t = String(title || "").trim();
      const u = String(url || "").trim();
      const fail = (message) => {
        toast.error(message);
        return Promise.resolve(false);
      };
      if (!t) return fail("Link title is required.");
      if (!isValidUrl(u)) return fail("Invalid URL.");
      if (socialLinks.some((s) => s.label.toLowerCase() === t.toLowerCase())) return fail("Link title already added.");
      if (socialLinks.some((s) => s.url && s.url === u)) return fail("URL already added.");
      return run(
        "social:add",
        () => callServer(() => saveMyProfile({ studentStandardId, items: [{ keyId: "socialMedia", fieldValue: `0~${u}~${t.slice(0, 100)}` }] })),
        "Link added!",
      );
    },
    // A school-defined file field: saved at once, like the existing page (cropImage -> saveDocs for CUSTOM_FILE).
    uploadCustomFile: (customProfileFieldId, file) =>
      run(`custom:${customProfileFieldId}`, () => postDocuments([{ docType: "CUSTOM_FILE", file }], { customProfileFieldId }), "Document saved!"),
    removeCustomFile: (customProfileFieldId) =>
      run(`custom:${customProfileFieldId}`, () => callServer(() => removeCustomFile({ customProfileFieldId })), "Document removed."),
    removeSocialLink: (userSocialMediaId) =>
      run(`social:${userSocialMediaId}`, () => callServer(() => removeSocialLink({ userSocialMediaId })), "Link removed."),
    removeDocument: (docType) => run(`doc:${docType}`, () => callServer(() => removeDocument({ docType })), "Document removed."),
  };
}
