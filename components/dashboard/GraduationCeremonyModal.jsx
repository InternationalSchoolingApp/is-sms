"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { useTranslations } from "next-intl";
import { useDateFnsLocale } from "@/i18n/dateLocale";
import { CalendarModal } from "@/components/dashboard/calendar/CalendarModal";

// The values go into the registration link (attendAs); the button labels are home.graduation.options.<lowercase value>.
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
  const t = useTranslations("home.graduation");
  const dateLocale = useDateFnsLocale();
  const [dismissed, setDismissed] = useState(false);
  const [attendAs, setAttendAs] = useState(ATTEND_OPTIONS[0]);
  if (dismissed) return null;

  const deadlineLabel = registrationDeadline ? format(parseISO(registrationDeadline), "MMM d, yyyy", { locale: dateLocale }) : null;

  return (
    <CalendarModal title={t("title")} onClose={() => setDismissed(true)}>
      {deadlineLabel && <p className="text-sm text-black/70">{t("registerBy", { date: deadlineLabel })}</p>}
      <p className="mt-2 text-xs font-bold uppercase tracking-wide text-black/50">{t("attendAs")}</p>
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
            {t(`options.${option.toLowerCase()}`)}
          </button>
        ))}
      </div>
      <a
        href={buildRegistrationLink(attendAs, studentEmail)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 block rounded-full bg-primary px-4 py-2 text-center text-sm font-bold text-white hover:opacity-90"
      >
        {t("continue")}
      </a>
    </CalendarModal>
  );
}
