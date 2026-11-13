"use client";

import { usePathname } from "next/navigation";
import { Users } from "lucide-react";
import { useSelectedChild } from "@/hooks/parent/useSelectedChild";

/**
 * "Select Another Child": shown on the Parent Dashboard home only. It clears the selection, which brings back the
 * child picker. Only for a parent with more than one child (with one, the picker would just select that child again).
 */
export function SelectAnotherChildButton() {
  const { children, selectedChild, clearChild } = useSelectedChild();
  const pathname = usePathname();
  if (!selectedChild || children.length < 2 || !/^\/[^/]+\/parent\/?$/.test(pathname || "")) return null;
  return (
    <div className="mx-auto mb-3 flex max-w-7xl justify-end">
      <button
        type="button"
        onClick={clearChild}
        className="inline-flex items-center gap-2 rounded-lg border border-primary px-3 py-1.5 text-sm font-semibold text-primary hover:bg-primary/5"
      >
        <Users className="h-4 w-4" aria-hidden="true" />
        Select Another Child
      </button>
    </div>
  );
}
