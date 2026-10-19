"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { StudentCalendarCard } from "@/components/dashboard/calendar/CalendarCard";
import { OnboardingVideoModal } from "@/components/dashboard/OnboardingVideoModal";
import { GraduationCeremonyModal } from "@/components/dashboard/GraduationCeremonyModal";
import { useStudentDashboardData } from "@/hooks/useStudentDashboardData";
import { STUDENT_NAV, studentNavHref } from "@/utils/dashboardNav";

/**
 * Student dashboard HOME.
 *
 * Phase B: the student CALENDAR (classes / activities / assignments /
 * school-events), announcements, the onboarding video popup and the
 * graduation-ceremony popup are all wired to the real backend. RE-ENROLLMENT
 * (batch re-enroll popup + discount countdown) is intentionally NOT shown
 * here — it is migrated on a separate branch.
 */
export function StudentHome() {
  const { context } = useDashboardContext();
  const { school } = useParams();
  const quickLinks = STUDENT_NAV.filter((n) => n.segment); // everything except the home tile itself
  const dashboardData = useStudentDashboardData({ schoolUUID: context?.schoolUUID, userId: context?.userId });

  return (
    <div className="mx-auto w-full">
      <div>
        <StudentCalendarCard schoolUUID={context?.schoolUUID} userId={context?.userId} />
      </div>
      {/* Quick links to the migrated modules (also in the left sidebar) */}
      <h3 className="mt-7 text-sm font-bold uppercase tracking-wide text-black/60">Modules</h3>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {quickLinks.map((item) => (
          <Link
            key={item.key}
            href={studentNavHref(school, item.segment)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-black transition-colors hover:border-primary hover:bg-primary/5"
          >
            {item.label}
          </Link>
        ))}
      </div>

      <OnboardingVideoModal videoUrl={dashboardData.videoUrl} />
      {dashboardData.showGraduationCeremonyPopup && (
        <GraduationCeremonyModal
          registrationDeadline={dashboardData.graduationCeremonyRegistrationDeadline}
          studentEmail={dashboardData.studentEmail}
        />
      )}
    </div>
  );
}
