"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AlertCircle, CheckCircle2, UserCircle, X } from "lucide-react";
import { loadProfileCompletingProcess } from "@/services/profileActionsApi";
import { callServer } from "@/utils/serverCall";
import { studentNavHref } from "@/utils/dashboardNav";

/**
 * "Complete Your Profile" popup for the standard (old shell) dashboard - the same rules as the grade looks'
 * K5CompleteProfileModal (legacy startProfileDataInModal): only the "NOW" fields that are still empty, the popup can be
 * closed unless one of them is required, and "Go to My Profile" takes the student there. Waits while `hold` is set
 * (the contact check goes first).
 */
const empty = (field) => field.fieldValue === null || field.fieldValue === undefined || String(field.fieldValue).trim() === "";
const label = (field) => field.labelName || field.fieldId || "Unknown field";

function FieldLine({ field }) {
  return (
    <li className="flex items-center gap-2 text-sm text-black/70">
      <AlertCircle className="h-4 w-4 flex-none text-amber-500" aria-hidden="true" />
      <span className="font-semibold">{label(field)}</span>
      {field.mandatoryOption === "Y" && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700">Required</span>}
    </li>
  );
}

function SectionBlock({ section }) {
  const loose = (section.parentChildList || []).filter(empty);
  const groups = (section.parentChildGroupList || [])
    .map((group) => ({ name: group.groupName, missing: (group.parentChildList || []).filter(empty) }))
    .filter((group) => group.missing.length > 0);
  if (!loose.length && !groups.length) return null;
  return (
    <div className="flex flex-col gap-2">
      <h4 className="m-0 text-sm font-bold text-black">{section.labelName}</h4>
      {loose.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {loose.map((field) => (
            <FieldLine key={field.id || field.fieldId} field={field} />
          ))}
        </ul>
      )}
      {groups.map((group) => (
        <div key={group.name} className="flex flex-col gap-1.5 pl-2">
          <span className="text-xs font-bold text-black/60">{group.name}</span>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {group.missing.map((field) => (
              <FieldLine key={field.id || field.fieldId} field={field} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function CompleteProfileModal({ hold = false }) {
  const { school } = useParams();
  const [data, setData] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    callServer(() => loadProfileCompletingProcess())
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch(() => {
        // setting off or the call failed: no popup
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (hold || dismissed || !data?.enabled || !data.profileData?.length) return null;

  const sections = data.profileData
    .map((section) => {
      const items = (section.parentChildList || []).filter((f) => f.scheduleType === "NOW");
      const groups = (section.parentChildGroupList || [])
        .map((g) => ({ ...g, parentChildList: (g.parentChildList || []).filter((f) => f.scheduleType === "NOW") }))
        .filter((g) => g.parentChildList.length > 0);
      const hasMissing = items.some(empty) || groups.some((g) => g.parentChildList.some(empty));
      return hasMissing ? { ...section, parentChildList: items, parentChildGroupList: groups } : null;
    })
    .filter(Boolean);
  if (!sections.length) return null;

  const missingFields = sections.flatMap((s) => [...s.parentChildList, ...s.parentChildGroupList.flatMap((g) => g.parentChildList)]).filter(empty);
  const total = missingFields.length;
  const mandatory = missingFields.some((f) => f.mandatoryOption === "Y");

  return (
    <div data-blocking-popup="" className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="complete-profile-title" className="flex max-h-[90vh] w-full max-w-[520px] flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center gap-3 bg-primary px-5 py-4 text-white">
          <UserCircle className="h-7 w-7 flex-none" aria-hidden="true" />
          <h2 id="complete-profile-title" className="m-0 flex-1 text-xl font-semibold">
            Complete Your Profile
          </h2>
          {!mandatory && (
            <button type="button" onClick={() => setDismissed(true)} aria-label="Close" className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-none bg-white/20 text-white hover:bg-white/30">
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="flex flex-col gap-4 overflow-y-auto p-5">
          <div className="flex items-center gap-2 rounded-xl border border-amber-400 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">
            <AlertCircle className="h-5 w-5 flex-none" aria-hidden="true" />
            <span>
              {total} field{total !== 1 ? "s" : ""} need{total === 1 ? "s" : ""} your attention
            </span>
          </div>
          {sections.map((section) => (
            <SectionBlock key={section.id || section.fieldId} section={section} />
          ))}
          {mandatory && <p className="m-0 rounded-lg bg-red-50 px-4 py-2.5 text-[13px] font-semibold text-red-700">Some fields are required. Please complete them to continue.</p>}
        </div>
        <div className="flex items-center justify-end gap-3 border-t px-5 py-4">
          {!mandatory && (
            <button type="button" onClick={() => setDismissed(true)} className="min-h-11 cursor-pointer rounded-full border border-slate-300 bg-white px-5 text-[15px] font-semibold text-black/70 hover:bg-slate-50">
              Later
            </button>
          )}
          <a href={studentNavHref(school, "my-profile")} className="flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-[15px] font-semibold text-white no-underline hover:opacity-90">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            Go to My Profile
          </a>
        </div>
      </div>
    </div>
  );
}
