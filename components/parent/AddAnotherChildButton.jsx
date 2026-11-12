"use client";

import { Loader2, UserPlus } from "lucide-react";
import { useAddAnotherChild } from "@/hooks/parent/useAddAnotherChild";

/**
 * "Add Another Child" (or "Resume {name}'s Enrollment"): opens the Add Another Student wizard in a new tab.
 * Renders nothing unless the school has switched the button on.
 */
export function AddAnotherChildButton() {
  const { visible, label, busy, handleClick } = useAddAnotherChild();
  if (!visible) return null;
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <UserPlus className="h-4 w-4" aria-hidden="true" />}
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}
