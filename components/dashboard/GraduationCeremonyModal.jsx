"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { CalendarModal } from "@/components/dashboard/calendar/CalendarModal";

const ATTEND_OPTIONS = ["Graduate", "Attendee", "Performer"];

function buildRegistrationLink(attendAs, email) {
  const url = new URL("https://event.internationalschooling.org");
  url.searchParams.set("attendAs", attendAs);
  // Hardcoded to "dubai" in the legacy JS too (not server-driven) — ported verbatim.
  url.searchParams.set("location", "dubai");
  if (email) url.searchParams.set("email", email);
  return url.toString();
}

/**
 * Graduation ceremony invite popup (legacy studentGraduationCeremontPopup /
 * initializeStudentGraduationCeremonyPopup). Shown when the dashboard
 * orchestrator's `showGraduationCeremonyPopup` flag is "Y".
 */
export function GraduationCeremonyModal({ registrationDeadline, studentEmail }) {
  const [dismissed, setDismissed] = useState(false);
  const [attendAs, setAttendAs] = useState(ATTEND_OPTIONS[0]);
  if (dismissed) return null;

  const deadlineLabel = registrationDeadline ? format(parseISO(registrationDeadline), "MMM d, yyyy") : null;

  return (
    <CalendarModal title="You're invited to the Graduation Ceremony! 🎓" onClose={() => setDismissed(true)}>
      {deadlineLabel && <p className="text-sm text-black/70">Register by {deadlineLabel} to join us.</p>}
      <p className="mt-2 text-xs font-bold uppercase tracking-wide text-black/50">Will you attend as</p>
      <div className="mt-1 grid grid-cols-3 gap-2">
        {ATTEND_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setAttendAs(option)}
            className={`rounded-lg border px-2 py-2 text-xs font-bold ${
              attendAs === option ? "border-primary bg-primary/10 text-primary" : "border-slate-200 text-black hover:border-primary"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
      <a
        href={buildRegistrationLink(attendAs, studentEmail)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 block rounded-full bg-primary px-4 py-2 text-center text-sm font-bold text-white hover:opacity-90"
      >
        Continue to registration
      </a>
    </CalendarModal>
  );
}
