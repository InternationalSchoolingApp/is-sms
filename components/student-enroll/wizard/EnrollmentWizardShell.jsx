"use client";

import { useState } from "react";
import Image from "next/image";
import { BookOpen, CreditCard, LogOut, User, Users } from "lucide-react";
import { LogoutConfirmDialog } from "@/components/student-enroll/wizard/LogoutConfirmDialog";
import { getLearningProgramTheme } from "@/utils/learningProgramTheme";

/**
 * Wizard chrome for the post-login enrollment flow (Student profile →
 * Parent information → Course Selection → Review and Payment). Visual
 * design matches the reference screenshot: a slim white top bar (logo +
 * Log Out), a centered program title + horizontal icon-step row below it,
 * then a single centered white card holding the step's own content.
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

export function EnrollmentWizardShell({ schoolName, logoUrl, context, currentStepKey, onLogout, children }) {
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const currentIndex = STEPS.findIndex((step) => step.key === currentStepKey);
  const programLabel = context ? getLearningProgramTheme(context.learningProgram).label : null;

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200 px-4 py-3 sm:px-6 fixed z-11 w-full bg-white">
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

      <div className="px-4 py-8 sm:px-6 bg-[#f2f5fa] pt-[62px]">
        {programLabel && (
          <div className="text-center">
            <h1 className="text-1.5xl font-extrabold text-slate-900 sm:text-2xl">{programLabel}</h1>
            <p className="mt-1 text-sm text-slate-500">Complete in under 1 minute</p>
          </div>
        )}

        <StepRow currentIndex={currentIndex} />

        <div className="mx-auto mt-6 max-w-5xl rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-4 lg:py-6 lg:px-8">
          {children}
        </div>
      </div>
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
    <div className="relative mx-auto mt-4 flex max-w-2xl items-center justify-between">
      <div className="absolute inset-x-6 top-4 h-px bg-slate-200 sm:top-5" />
      <div
        className="absolute inset-x-6 top-4 h-1 bg-green-600 transition-[width] sm:top-5"
        style={{ width: `calc(${progressPercent}% - ${progressPercent === 0 ? "0px" : "24px"})` }}
      />
      {STEPS.map((step, index) => (
        <div key={step.key} className="relative z-10 flex flex-col items-center gap-2">
          <StepCircle icon={step.icon} state={stepState(index, currentIndex)} />
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Step {index + 1}</span>
        </div>
      ))}
    </div>
  );
}

function StepCircle({ icon: Icon, state }) {
  return (
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 sm:h-10 sm:w-10 ${
        state === "active"
          ? "border-primary text-primary bg-white"
          : state === "done"
            ? "border-green-600 bg-green-600 text-white"
            : "border-slate-300 text-slate-400"
      }`}
    >
      <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
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
