"use client";

import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useSelectedChild } from "@/hooks/parent/useSelectedChild";
import { useAddAnotherChild } from "@/hooks/parent/useAddAnotherChild";
import { greetingForHour } from "@/utils/parentHome";

/**
 * The top row of the parent home (design board): the greeting pill and the parent's name, "Select Another Child" (only
 * with more than one child: it clears the choice, which brings back the child picker) and "Enroll another child"
 * (Add Another Child, only when the school has it on).
 */
export function HomeTopRow() {
  const { context } = useDashboardContext();
  const { children, clearChild } = useSelectedChild();
  const addChild = useAddAnotherChild();
  const hour = new Date().getHours();
  const daytime = hour >= 5 && hour < 17;

  return (
    <div className="top">
      <div className="greet">
        <span className="hi">
          {daytime ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="4.5" fill="#FFC531" />
              <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" stroke="#FFD25A" strokeWidth="2" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15 3a9 9 0 1 0 6 15A7.5 7.5 0 0 1 15 3z" fill="#FFE08A" />
            </svg>
          )}
          {greetingForHour(hour)}
        </span>
        <h1>{context?.userName || "Parent"}</h1>
      </div>
      <div className="acts">
        {children.length > 1 && (
          <button type="button" className="btn" onClick={clearChild}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M16 3h5v5M21 3l-7 7M8 21H3v-5M3 21l7-7" />
            </svg>
            Select Another Child
          </button>
        )}
        {addChild.visible && (
          <button type="button" className="btn ol" onClick={addChild.handleClick} disabled={addChild.busy}>
            {addChild.label === "Add Another Child" ? "Enroll another child" : addChild.label}
          </button>
        )}
      </div>
    </div>
  );
}
