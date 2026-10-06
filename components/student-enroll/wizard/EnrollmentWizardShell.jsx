"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { BookOpen, CreditCard, LogOut, User, Users } from "lucide-react";
import { Footer } from "@/components/common/Footer";
import { LogoutConfirmDialog } from "@/components/student-enroll/wizard/LogoutConfirmDialog";
import { getLearningProgramTheme } from "@/utils/learningProgramTheme";

const STEPS = [
  { key: "student", label: "Student profile", icon: User },
  { key: "parent", label: "Parent information", icon: Users },
  { key: "course_selection", label: "Course Selection", icon: BookOpen },
  { key: "review_and_payment", label: "Review and Payment", icon: CreditCard },
];

export function EnrollmentWizardShell({ schoolName, logoUrl, context, currentStepKey, onLogout, plain = false, hideStepper = false, children }) {
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const currentIndex = STEPS.findIndex((step) => step.key === currentStepKey);
  const programLabel = context ? getLearningProgramTheme(context.learningProgram).label : null;
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="fixed top-[var(--maintenance-banner-h,0px)] z-11 hidden w-full border-b border-slate-200 bg-white px-4 py-3 sm:px-6 md:block">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <LogoMark schoolName={schoolName} logoUrl={logoUrl} />
          <button
            type="button"
            onClick={() => setConfirmLogout(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-2 py-1.5 cursor-pointer text-sm font-semibold text-white hover:bg-red-700 duration-150"
          >
            <LogOut className="h-4 w-4 stroke-3" /> Log Off
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

      <div className="flex-1 bg-[#f2f5fa] px-4 pb-6 md:px-6 md:py-8 md:pb-24 md:pt-[62px]">
        <div className="sticky top-0 z-20 -mx-4 bg-[#f2f5fa] px-4 pb-3 max-[579px]:pb-1 md:static md:mx-0 md:bg-transparent md:px-0 md:pb-0">
        <header className="grid grid-cols-[2rem_1fr_2rem] items-center gap-2 px-1 py-4 max-[579px]:py-2 md:hidden">
          <Image src="/images/Fav_Icon.png" alt={schoolName || ""} width={28} height={28} className="h-7 w-auto" unoptimized />
          <div className="text-center">
            {programLabel && <h1 className="text-base font-extrabold leading-tight text-black">{programLabel}</h1>}
            <p className="mt-0.5 text-[12px] leading-tight text-primary font-semibold">Complete your enrollment in just 5 minutes</p>
          </div>
          <button
            type="button"
            aria-label="Log Out"
            onClick={() => setConfirmLogout(true)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700"
          >
            <LogOut className="h-4 w-4 stroke-3" aria-hidden="true" />
          </button>
        </header>

        {programLabel && (
          <div className="hidden text-center md:block">
            <h1 className="text-1.5xl font-extrabold text-black sm:text-2xl">{programLabel}</h1>
            <p className="mt-1 text-sm text-slate-500">Complete your enrollment in just 5 minutes</p>
          </div>
        )}

        {!hideStepper && <StepRow currentIndex={currentIndex} />}
        </div>

        {plain ? (
          // Review & payment lays its own white cards directly on the page background.
          <div className="mx-auto mt-6 max-w-[1310px] md:mt-8">{children}</div>
        ) : (
          
            <>
              {children}
            </>
          
        )}
      </div>

      {/* Desktop floating WhatsApp support button, fixed above the fixed footer. Below md every step's
          fixed action bar (MobileActionBar) carries the icon instead. */}
      {context?.whatsAppNumber && (
        <a
          href={`https://api.whatsapp.com/send?phone=${context.whatsAppNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Enrollment support on WhatsApp"
          className="fixed bottom-[72px] right-6 z-30 hidden transition-transform hover:scale-105 md:block"
        >
          <Image src="/images/whatsapp-new.webp" alt="" width={50} height={50} unoptimized className="h-[50px] w-[50px]" />
        </a>
      )}

      <Footer schoolName={schoolName} fixed />
    </div>
  );
}

function stepState(index, currentIndex) {
  if (index === currentIndex) return "active";
  if (index < currentIndex) return "done";
  return "upcoming";
}

// The step the student was on before the current one, kept across route changes (the shell may remount per
// step page). A fresh page load has none, so a refresh shows the check marks without replaying the gif.
let previousStepIndex = null;

function StepRow({ currentIndex }) {
  const arrivedForward = previousStepIndex !== null && currentIndex === previousStepIndex + 1;
  useEffect(() => {
    previousStepIndex = currentIndex;
  }, [currentIndex]);
  const progressPercent = STEPS.length > 1 ? (Math.max(currentIndex, 0) / (STEPS.length - 1)) * 100 : 0;

  return (
    <div className="mx-auto mt-2 max-w-2xl px-4 max-[579px]:mt-0 md:mt-4 md:px-0">
      {/* Below 580px the whole stepper (circles, line, icons) is drawn at 70% of its size. */}
      <div className="relative mx-auto flex items-start justify-between max-[579px]:[zoom:0.7]">
        <div className="absolute inset-x-[18px] top-[18px] -translate-y-1/2 md:inset-x-8 md:top-5" aria-hidden="true">
          <div className="h-[3px] w-full bg-slate-200 md:h-px" />
          <div
            className="absolute left-0 top-1/2 h-[3px] -translate-y-1/2 bg-green-600 transition-[width] md:h-1"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        {STEPS.map((step, index) => (
          <div key={step.key} className="relative z-10 flex w-9 flex-col items-center gap-2 md:w-16">
            <StepCircle
              icon={step.icon}
              state={stepState(index, currentIndex)}
              justCompleted={index === currentIndex - 1}
              animate={arrivedForward && index === currentIndex - 1}
            />
            <span className="hidden text-[11px] font-semibold uppercase tracking-wide text-slate-500 md:block">Step {index + 1}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// OrderSuccess.gif loops and runs about 2.8s per cycle, so a moving-forward celebration plays for one cycle.
const STEP_GIF_MS = 2900;

function StepCircle({ icon: Icon, state, justCompleted, animate }) {
  // Every time the student moves forward a step, the step they just finished plays the gif once and then
  // settles on the static check mark. "idle" -> "playing" (set during render, React's derive-state pattern)
  // -> "done" (timer); it returns to "idle" once the step is no longer the just-completed one.
  const [gifPhase, setGifPhase] = useState("idle");
  if (animate && gifPhase === "idle") setGifPhase("playing");
  if (!justCompleted && gifPhase !== "idle") setGifPhase("idle");
  useEffect(() => {
    if (gifPhase !== "playing") return undefined;
    const timer = setTimeout(() => setGifPhase("done"), STEP_GIF_MS);
    return () => clearTimeout(timer);
  }, [gifPhase]);
  const playGif = gifPhase === "playing";

  // Finished steps are drawn as images centred on the step circle. The step completed just before
  // the current one plays OrderSuccess.gif (transparent background, ends as a 64px green circle with
  // a tick inside its 150px canvas); every earlier finished step shows the static check_box.svg
  // (41px canvas, green circle r=15.75). Each image is scaled so its green circle equals the step
  // circle (36px below md, 40px from md): gif 150*36/64 = 84px and 150*40/64 = 94px, svg
  // 41*36/31.5 = 47px and 41*40/31.5 = 52px. Being absolute, the gif's pop can overshoot the row.
  if (state === "done") {
    return (
      <div className="relative h-9 w-9 shrink-0 md:h-10 md:w-10">
        {playGif ? (
          <Image
            src="/images/OrderSuccess.gif"
            alt="Step completed"
            width={150}
            height={150}
            unoptimized
            className="pointer-events-none absolute left-1/2 top-1/2 h-[84px] w-[84px] max-w-none -translate-x-1/2 -translate-y-1/2 md:h-[94px] md:w-[94px]"
          />
        ) : (
          <Image
            src="/images/check_box.svg"
            alt="Step completed"
            width={41}
            height={41}
            unoptimized
            className="pointer-events-none absolute left-1/2 top-1/2 h-[47px] w-[47px] max-w-none -translate-x-1/2 -translate-y-1/2 md:h-[52px] md:w-[52px]"
          />
        )}
      </div>
    );
  }
  return (
    <div
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 md:h-10 md:w-10 ${
        state === "active"
          ? "border-primary bg-white text-primary ring-4 ring-primary/20 md:ring-0"
          : "border-slate-300 bg-[#f2f5fa] text-slate-400"
      }`}
    >
      <Icon className="h-4 w-4 md:h-6 md:w-6" aria-hidden="true" />
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
        <p className="text-sm font-bold leading-tight text-black">{schoolName || "International Schooling"}</p>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Admissions Portal</p>
      </div>
    </div>
  );
}
