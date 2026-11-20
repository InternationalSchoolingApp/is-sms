"use client";

import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import { useTranslations } from "next-intl";
import { addActivity, addClassTime, removeActivity, removeClassTime, removeCustomFile, removeDocument, removeSocialLink } from "@/services/profileActionsApi";
import { saveMyProfile } from "@/services/profileSaveApi";
import { callingPreferences, isValidUrl } from "@/utils/profileEdit";
import { callServer } from "@/utils/serverCall";
import { markSessionExpired } from "@/utils/sessionState";
import { useLabelTranslator } from "@/i18n/labels";

/**
 * My Profile P3 changes that save straight away, like the existing page: live-class times, parent calling times,
 * joined activities, and documents. Each call shows a toast and reloads the profile. `busy` names the running action
 * (e.g. "time:add", "doc:Age Proof"), so a button can show it is working.
 */
/** Posts { docType, file } pairs to app/api/profile/document (multipart; one save-docs call on the server). */
async function postDocuments(list, extra = {}, failMessage = "The document could not be saved.") {
  const form = new FormData();
  for (const { docType, file } of list) {
    form.append("docType", docType);
    form.append("file", file);
  }
  Object.entries(extra).forEach(([k, v]) => form.set(k, String(v)));
  const response = await fetch("/api/profile/document", { method: "POST", body: form });
  const body = await response.json().catch(() => null);
  if (response.status === 401 && body?.sessionExpired) markSessionExpired();
  if (!response.ok) throw new Error(body?.message || failMessage);
}

// The existing page allows three preferred times per list (profileViewNew.js addClassPreferredTime /
// addCommunicationPreferredTime).
const MAX_TIMES = 3;

export function useProfileActions({ studentStandardId, refetch, callingSlots = [], classSlots = [], socialLinks = [] }) {
  const tt = useTranslations("profile.toast");
  const tc = useTranslations("common");
  const field = useLabelTranslator("profile.fields");
  const [busy, setBusy] = useState(null);
  const saveDocs = (list, extra = {}) => postDocuments(list, extra, tt("documentNotSaved"));

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
        toast.error(String(error?.message || tc("status.somethingWentWrong")).replace(/^[A-Z_0-9]+:\s*/, ""));
        return false;
      } finally {
        setBusy(null);
      }
    },
    [busy, refetch, tc],
  );

  const saveCalling = (slots, roles) =>
    callServer(() => saveMyProfile({ studentStandardId, items: [{ keyId: "communicationPreferredSlots", callingPreferences: callingPreferences(slots, roles) }] }));

  return {
    busy,
    refetch,
    addClassTime: (start, end) => {
      if (classSlots.length >= MAX_TIMES) {
        toast.error(tt("maxClassTimes"));
        return Promise.resolve(false);
      }
      return run("time:add", () => callServer(() => addClassTime({ start, end })), tt("timeSaved"));
    },
    removeClassTime: (id) => run(`time:${id}`, () => callServer(() => removeClassTime({ timePrefId: id })), tt("timeRemoved")),
    addCallingTime: (role, start, end) => {
      if (callingSlots.filter((x) => x.role === role).length >= MAX_TIMES) {
        toast.error(tt("maxCallingTimes", { role: field(role) ?? "" }));
        return Promise.resolve(false);
      }
      if (callingSlots.some((x) => x.role === role && x.start === start && x.end === end)) {
        toast.error(tt("timeAlreadyAdded"));
        return Promise.resolve(false);
      }
      if (callingSlots.some((x) => x.role === role && start < x.end && end > x.start)) {
        toast.error(tt("timeOverlaps"));
        return Promise.resolve(false);
      }
      return run("call:add", () => saveCalling([...callingSlots, { role, start, end }], [role]), tt("timeSaved"));
    },
    removeCallingTime: (index) => {
      const slot = callingSlots[index];
      if (!slot) return Promise.resolve(false);
      return run(`call:${index}`, () => saveCalling(callingSlots.filter((_, i) => i !== index), [slot.role]), tt("timeRemoved"));
    },
    addActivity: (values) => run("activity:add", () => callServer(() => addActivity(values)), tt("activityAdded")),
    removeActivity: (id) => run(`activity:${id}`, () => callServer(() => removeActivity({ id })), tt("activityRemoved")),
    uploadDocument: (docType, file) =>
      run(`doc:${docType}`, () => saveDocs([{ docType, file }]), docType === "Profile Image" ? tt("photoSaved") : tt("documentSaved")),
    // Documents section "Save Documents": every chosen proof in one save-docs call, like the existing page.
    uploadDocuments: (list) => run("doc:save", () => saveDocs(list), list.length > 1 ? tt("documentsSaved") : tt("documentSaved")),
    // "Add other social media link" (profileViewNew.js addOtherSocialLinks): saved as socialMedia "0~url~title".
    addSocialLink: (title, url) => {
      const t = String(title || "").trim();
      const u = String(url || "").trim();
      const fail = (message) => {
        toast.error(message);
        return Promise.resolve(false);
      };
      if (!t) return fail(tt("linkTitleRequired"));
      if (!isValidUrl(u)) return fail(tt("invalidUrl"));
      if (socialLinks.some((s) => s.label.toLowerCase() === t.toLowerCase())) return fail(tt("linkTitleExists"));
      if (socialLinks.some((s) => s.url && s.url === u)) return fail(tt("urlExists"));
      return run(
        "social:add",
        () => callServer(() => saveMyProfile({ studentStandardId, items: [{ keyId: "socialMedia", fieldValue: `0~${u}~${t.slice(0, 100)}` }] })),
        tt("linkAdded"),
      );
    },
    // A school-defined file field: saved at once, like the existing page (cropImage -> saveDocs for CUSTOM_FILE).
    uploadCustomFile: (customProfileFieldId, file) =>
      run(`custom:${customProfileFieldId}`, () => saveDocs([{ docType: "CUSTOM_FILE", file }], { customProfileFieldId }), tt("documentSaved")),
    removeCustomFile: (customProfileFieldId) =>
      run(`custom:${customProfileFieldId}`, () => callServer(() => removeCustomFile({ customProfileFieldId })), tt("documentRemoved")),
    removeSocialLink: (userSocialMediaId) =>
      run(`social:${userSocialMediaId}`, () => callServer(() => removeSocialLink({ userSocialMediaId })), tt("linkRemoved")),
    removeDocument: (docType) => run(`doc:${docType}`, () => callServer(() => removeDocument({ docType })), tt("documentRemoved")),
  };
}
