"use client";

import { useState } from "react";
import Image from "next/image";
import { BookOpen, Check, CreditCard, LogOut, User, Users } from "lucide-react";
import { Footer } from "@/components/common/Footer";
import { LogoutConfirmDialog } from "@/components/student-enroll/wizard/LogoutConfirmDialog";
import { getLearningProgramTheme } from "@/utils/learningProgramTheme";

/**
 * Wizard chrome for the post-login enrollment flow (Student profile →
 * Parent information → Course Selection → Review and Payment). Visual
 * design matches the reference screenshot: a slim white top bar (logo +
 * Log Out), a centered program title + horizontal icon-step row below it,
 * then a single centered white card holding the step's own content.
 *
 * Below md the top bar becomes a plain header on the page background (favicon, centered title and
 * subtitle, round log-out button) and the step row drops its labels and shows check marks.
 *
 * `context` is only read for `context.learningProgram` (via
 * getLearningProgramTheme) to resolve the title text — every other prop is
 * unchanged from before this redesign, so no step page's data flow changes.
 */
const STEPS = [
  { key: "student", label: "Student profile", icon: User },
  { key: "parent", label: "Parent information", icon: Users },
  { key: "course_selection", label: "Course Selection", icon: BookOpen },
  { key: "review_and_payment", label: "Review and Payment", icon: CreditCard },
];

export function EnrollmentWizardShell({ schoolName, logoUrl, context, currentStepKey, onLogout, plain = false, children }) {
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const currentIndex = STEPS.findIndex((step) => step.key === currentStepKey);
  const programLabel = context ? getLearningProgramTheme(context.learningProgram).label : null;
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="fixed z-11 hidden w-full border-b border-slate-200 bg-white px-4 py-3 sm:px-6 md:block">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <LogoMark schoolName={schoolName} logoUrl={logoUrl} />
          <button
            type="button"
            onClick={() => setConfirmLogout(true)}
            className="inline-flex items-center gap-2 rounded bg-slate-900 px-2 py-1.5 cursor-pointer text-sm font-semibold text-white hover:bg-slate-800"
          >
            <LogOut className="h-4 w-4" /> Log Out
          </button>
        </div>
      </header>

      <LogoutConfirmDialog
        open={confirmLogout}
        busy={loggingOut}
        onCancel={() => setConfirmLogout(false)}
        onConfirm={async () => {
          setLoggingOut(true);
          try {
            await onLogout();
          } finally {
            setLoggingOut(false);
            setConfirmLogout(false);
          }
        }}
      />

      <div className="flex-1 bg-[#f2f5fa] px-4 pb-16 md:px-6 md:py-8 md:pb-24 md:pt-[62px]">
        {/* Mobile header: favicon | title + subtitle | round log-out. */}
        <header className="grid grid-cols-[2rem_1fr_2rem] items-center gap-2 px-1 py-4 md:hidden">
          <Image src="/images/is_fav_logo_200.png" alt={schoolName || ""} width={28} height={28} className="h-7 w-auto" unoptimized />
          <div className="text-center">
            {programLabel && <h1 className="text-base font-extrabold leading-tight text-slate-900">{programLabel}</h1>}
            <p className="mt-0.5 text-[13px] leading-tight text-slate-500">Complete in under 1 minute</p>
          </div>
          <button
            type="button"
            aria-label="Log Out"
            onClick={() => setConfirmLogout(true)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white hover:bg-slate-800"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        {programLabel && (
          <div className="hidden text-center md:block">
            <h1 className="text-1.5xl font-extrabold text-slate-900 sm:text-2xl">{programLabel}</h1>
            <p className="mt-1 text-sm text-slate-500">Complete in under 1 minute</p>
          </div>
        )}

        <StepRow currentIndex={currentIndex} />

        {plain ? (
          // Review & payment lays its own white cards directly on the page background.
          <div className="mx-auto mt-6 max-w-[1310px] md:mt-8">{children}</div>
        ) : (
          
            <>
              {children}
            </>
          
        )}
      </div>

      <Footer schoolName={schoolName} fixed />
    </div>
  );
}

function stepState(index, currentIndex) {
  if (index === currentIndex) return "active";
  if (index < currentIndex) return "done";
  return "upcoming";
}

function StepRow({ currentIndex }) {
  const progressPercent = STEPS.length > 1 ? (Math.max(currentIndex, 0) / (STEPS.length - 1)) * 100 : 0;

  return (
    <div className="mx-auto mt-2 max-w-2xl px-4 md:mt-4 md:px-0">
      <div className="relative flex items-start justify-between">
        {/* Steps are fixed-width columns (circle-wide on mobile, w-16 from md), so circle centres sit
            a fixed distance from each end; the track runs exactly first-centre to last-centre and the
            green bar is a % of that track. */}
        <div className="absolute inset-x-[18px] top-[18px] -translate-y-1/2 md:inset-x-8 md:top-5" aria-hidden="true">
          <div className="h-[3px] w-full bg-slate-200 md:h-px" />
          <div
            className="absolute left-0 top-1/2 h-[3px] -translate-y-1/2 bg-green-600 transition-[width] md:h-1"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        {STEPS.map((step, index) => (
          <div key={step.key} className="relative z-10 flex w-9 flex-col items-center gap-2 md:w-16">
            <StepCircle icon={step.icon} state={stepState(index, currentIndex)} />
            <span className="hidden text-[11px] font-semibold uppercase tracking-wide text-slate-500 md:block">Step {index + 1}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepCircle({ icon: Icon, state }) {
  return (
    <div
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 md:h-10 md:w-10 ${
        state === "active"
          ? "border-primary bg-white text-primary ring-4 ring-primary/20 md:ring-0"
          : state === "done"
            ? "border-green-600 bg-green-600 text-white"
            : "border-slate-300 bg-[#f2f5fa] text-slate-400"
      }`}
    >
      {state === "done" ? (
        <>
          <Check className="h-5 w-5 md:hidden" strokeWidth={3} aria-hidden="true" />
          <Icon className="hidden h-6 w-6 md:block" aria-hidden="true" />
        </>
      ) : (
        <Icon className="h-4 w-4 md:h-6 md:w-6" aria-hidden="true" />
      )}
    </div>
  );
}

// Same actual school logo image as the login page (LoginPage,
// app/[schoolId]/common/login/page.jsx) — via getSchoolSettingsLinks()'s
// logoUrl, not a hardcoded "IS" mark. Falls back to that mark only while
// logoUrl hasn't resolved yet (or a school has none configured).
function LogoMark({ schoolName, logoUrl }) {
  if (logoUrl) {
    return <Image src={logoUrl} alt={schoolName || ""} width={160} height={36} className="w-full max-w-[160px] sm:max-w-[220px]" unoptimized />;
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-bold text-white">IS</div>
      <div>
        <p className="text-sm font-bold leading-tight text-slate-900">{schoolName || "International Schooling"}</p>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Admissions Portal</p>
      </div>
    </div>
  );
}
