"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Calendar } from "lucide-react";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { STUDENT_NAV, studentNavHref } from "@/utils/dashboardNav";

/**
 * Student dashboard HOME — Phase A landing.
 *
 * Phase A proves the foundation (shell + sidebar + context + auth) is wired.
 * Phase B replaces the placeholder below with the real home: the student
 * CALENDAR (classes / activities / assignments / school-events) plus
 * announcements, onboarding video, graduation popup and holidays.
 * RE-ENROLLMENT (batch re-enroll popup + discount countdown) is intentionally
 * NOT shown here — it is migrated on a separate branch.
 */
export function StudentHome() {
  const { context } = useDashboardContext();
  const { school } = useParams();
  const quickLinks = STUDENT_NAV.filter((n) => n.segment); // everything except the home tile itself

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-xl font-extrabold text-black sm:text-2xl">
        Welcome{context?.schoolName ? ` to ${context.schoolName}` : ""}
      </h1>
      <p className="mt-1 text-sm text-black/60">Student dashboard</p>

      {/* Phase B placeholder for the calendar */}
      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Calendar className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-base font-bold text-black">Your calendar</h2>
            <p className="text-sm text-black/60">Classes, activities and assignments will appear here (Phase B).</p>
          </div>
        </div>
      </section>

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
    </div>
  );
}
