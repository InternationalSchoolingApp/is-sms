"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { X, Loader2, UserCircle, CheckCircle2, AlertCircle } from "lucide-react";
import { loadProfileCompletingProcess } from "@/services/profileActionsApi";
import { callServer } from "@/utils/serverCall";
import { studentNavHref } from "@/utils/dashboardNav";

function fieldLabel(field) {
  return field.labelName || field.fieldId || "Unknown field";
}

function isMissing(field) {
  const val = field.fieldValue;
  return val === null || val === undefined || String(val).trim() === "";
}

function SectionBlock({ section }) {
  const items = section.parentChildList || [];
  const groups = section.parentChildGroupList || [];
  const missing = items.filter(isMissing);
  const missingGrouped = groups
    .map((g) => ({
      groupName: g.groupName,
      missing: (g.parentChildList || []).filter(isMissing),
    }))
    .filter((g) => g.missing.length > 0);

  if (!missing.length && !missingGrouped.length) return null;

  return (
    <div className="flex flex-col gap-2">
      <h4 className="m-0 text-sm font-black text-k5-ink">{section.labelName}</h4>
      {missing.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-1.5 pl-0">
          {missing.map((f) => (
            <li key={f.id || f.fieldId} className="flex items-center gap-2 text-sm text-k5-mut">
              <AlertCircle className="h-4 w-4 flex-none text-amber-500" />
              <span className="font-extrabold">{fieldLabel(f)}</span>
              {f.mandatoryOption === "Y" && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-black text-k5-ri">Required</span>}
            </li>
          ))}
        </ul>
      )}
      {missingGrouped.map((g) => (
        <div key={g.groupName} className="flex flex-col gap-1.5 pl-2">
          <span className="text-xs font-black text-k5-mut">{g.groupName}</span>
          <ul className="m-0 flex list-none flex-col gap-1.5 pl-0">
            {g.missing.map((f) => (
              <li key={f.id || f.fieldId} className="flex items-center gap-2 text-sm text-k5-mut">
                <AlertCircle className="h-4 w-4 flex-none text-amber-500" />
                <span className="font-extrabold">{fieldLabel(f)}</span>
                {f.mandatoryOption === "Y" && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-black text-k5-ri">Required</span>}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function K5CompleteProfileModal() {
  const { school } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    callServer(() => loadProfileCompletingProcess())
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch(() => {
        // setting is off or API failed — no modal
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  if (loading || dismissed || !data) return null;

  const { profileData, enabled } = data;
  if (!enabled || !profileData?.length) return null;

  // Filter to NOW schedule items and find which have missing fields
  const nowSections = profileData
    .map((section) => {
      const items = section.parentChildList || [];
      const groups = section.parentChildGroupList || [];
      const nowItems = items.filter((f) => f.scheduleType === "NOW");
      const nowGroups = groups
        .map((g) => ({
          ...g,
          parentChildList: (g.parentChildList || []).filter((f) => f.scheduleType === "NOW"),
        }))
        .filter((g) => g.parentChildList.length > 0);
      const hasMissing =
        nowItems.some(isMissing) ||
        nowGroups.some((g) => g.parentChildList.some(isMissing));
      if (!hasMissing) return null;
      return { ...section, parentChildList: nowItems, parentChildGroupList: nowGroups };
    })
    .filter(Boolean);

  if (!nowSections.length) return null;

  // Check if any field is mandatory — if so, user can't dismiss
  const hasMandatory = nowSections.some((s) => {
    const items = s.parentChildList || [];
    const groups = s.parentChildGroupList || [];
    return (
      items.some((f) => isMissing(f) && f.mandatoryOption === "Y") ||
      groups.some((g) => (g.parentChildList || []).some((f) => isMissing(f) && f.mandatoryOption === "Y"))
    );
  });

  const totalMissing = nowSections.reduce((sum, s) => {
    const items = (s.parentChildList || []).filter(isMissing).length;
    const grouped = (s.parentChildGroupList || []).reduce(
      (gs, g) => gs + (g.parentChildList || []).filter(isMissing).length,
      0
    );
    return sum + items + grouped;
  }, 0);

  const profileUrl = studentNavHref(school, "my-profile");

  return (
    <div data-blocking-popup="" className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4">
      <div className="relative flex max-h-[90vh] w-full max-w-[520px] flex-col overflow-hidden rounded-3xl border-[3px] border-k5-line bg-k5-card shadow-xl">
        {/* Header */}
        <div className="flex items-center gap-3 border-b-[3px] border-k5-line bg-k5-ac px-5 py-4">
          <UserCircle className="h-7 w-7 flex-none text-white" />
          <h2 className="m-0 flex-1 font-k5-display text-xl font-semibold text-white">Complete Your Profile</h2>
          {!hasMandatory && (
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-none bg-white/20 text-white hover:bg-white/30"
              aria-label="Close"
            >
              <X className="h-5 w-5" strokeWidth={2.5} />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex flex-col gap-4 overflow-y-auto p-5 [scrollbar-width:thin]">
          <div className="flex items-center gap-2 rounded-2xl border-[3px] border-amber-400 bg-amber-50 px-4 py-3 text-sm font-black text-amber-700">
            <AlertCircle className="h-5 w-5 flex-none" />
            <span>{totalMissing} field{totalMissing !== 1 ? "s" : ""} need{totalMissing === 1 ? "s" : ""} your attention</span>
          </div>

          {nowSections.map((section) => (
            <SectionBlock key={section.id || section.fieldId} section={section} />
          ))}

          {hasMandatory && (
            <p className="m-0 rounded-xl bg-red-50 px-4 py-2.5 text-[13px] font-extrabold text-k5-ri">
              Some fields are required. Please complete them to continue.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t-[3px] border-k5-line px-5 py-4">
          {!hasMandatory && (
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="min-h-11 cursor-pointer rounded-full border-[3px] border-k5-line bg-k5-card px-5 font-k5-display text-[15px] font-semibold text-k5-mut hover:bg-k5-soft"
            >
              Later
            </button>
          )}
          <a
            href={profileUrl}
            className="flex min-h-11 items-center gap-2 rounded-full border-[3px] border-k5-ac bg-k5-ac px-5 font-k5-display text-[15px] font-semibold text-white no-underline shadow-[0_3px_0_var(--k5-acd)] hover:brightness-105"
          >
            <CheckCircle2 className="h-4.5 w-4.5" />
            Go to My Profile
          </a>
        </div>
      </div>
    </div>
  );
}
