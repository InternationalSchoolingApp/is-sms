"use client";

import Image from "next/image";

/**
 * Sidebar-driven wizard shell for the post-login enrollment flow (Student
 * profile → Parent information → Documents → Payment). Only Stage 1
 * ("Student profile") has a real screen behind it so far — the other three
 * steps render as inactive placeholders in the nav until Stages 2-4 exist,
 * matching the plan's own step ordering.
 *
 * Desktop: a fixed left sidebar (logo + numbered step list + log out).
 * Tablet/mobile: the sidebar collapses into a top bar (logo + log out) plus
 * a compact horizontal row of step circles, content stacking full-width
 * below it.
 */
const STEPS = [
  { key: "student", label: "Student profile" },
  { key: "parent", label: "Parent information" },
  { key: "course_selection", label: "Course Selection" },
  { key: "review_and_payment", label: "Review and Payment" },
];

export function EnrollmentWizardShell({ schoolName, logoUrl, currentStepKey, onLogout, children }) {
  const currentIndex = STEPS.findIndex((step) => step.key === currentStepKey);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#eef1f5] lg:flex-row">
      {/* Desktop sidebar — fixed in place (own column, full viewport
          height, never scrolls); only <main> below scrolls. Matches the
          "desktop" mockup; tablet width still uses the collapsed top bar,
          same as mobile, per the "tablet"/"mobile" mockups (both collapsed,
          only the widest, true-desktop view keeps the persistent sidebar). */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        <SidebarHeader schoolName={schoolName} logoUrl={logoUrl} />
        <nav className="flex-1 space-y-1 px-3 py-4">
          {STEPS.map((step, index) => (
            <StepRow key={step.key} index={index} label={step.label} state={stepState(index, currentIndex)} />
          ))}
        </nav>
        <SidebarFooter onLogout={onLogout} />
      </aside>

      {/* Tablet/mobile top bar — also fixed in place (shrink-0, outside the
          scrolling column below), not sticky-on-scroll. */}
      <header className="flex shrink-0 flex-col border-b border-slate-200 bg-white lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <LogoMark schoolName={schoolName} logoUrl={logoUrl} />
          <button type="button" onClick={onLogout} className="text-sm text-primary">
            Log out
          </button>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto px-4 pb-3 justify-around">
          {STEPS.map((step, index) => (
            <div key={step.key} className="inline-flex flex-col items-center">
              <StepCircle index={index} state={stepState(index, currentIndex)} />
              <p className={`w-full text-sm text-center ${stepState(index, currentIndex) === "active" ? "border-primary text-primary" : stepState(index, currentIndex) === "done" ? "border-primary bg-primary text-white" : "border-slate-300 text-slate-400"}`}>
                  {step.label}
              </p>
            </div>
          ))}
        </div>
      </header>

      {/* The only scrolling region — the form itself. */}
      <main className="flex-1 overflow-y-auto px-4 py-8 sm:px-8 lg:px-12 lg:py-4">
        <div className="mx-auto max-w-3xl">{children}</div>
      </main>
    </div>
  );
}

function stepState(index, currentIndex) {
  if (index === currentIndex) return "active";
  if (index < currentIndex) return "done";
  return "upcoming";
}

// Same actual school logo image as the login page (LoginPage,
// app/[schoolId]/common/login/page.jsx) — via getSchoolSettingsLinks()'s
// logoUrl, not a hardcoded "IS" mark. Falls back to that mark only while
// logoUrl hasn't resolved yet (or a school has none configured).
function LogoMark({ schoolName, logoUrl }) {
  if (logoUrl) {
    return <Image src={logoUrl} alt={schoolName || ""} width={160} height={36} className="w-full sm:max-w-[250px] max-w-[200px]" unoptimized />;
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

function SidebarHeader({ schoolName, logoUrl }) {
  return (
    <div className="border-b border-slate-200 px-5 py-5">
      <LogoMark schoolName={schoolName} logoUrl={logoUrl} />
    </div>
  );
}

function SidebarFooter({ onLogout }) {
  return (
    <div className="border-t border-slate-200 px-5 py-4">
      <p className="text-xs text-slate-500">Enrollment session</p>
      <button type="button" onClick={onLogout} className="text-sm text-primary">
        Log out
      </button>
    </div>
  );
}

function StepRow({ index, label, state }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${state === "active" ? "bg-[color-mix(in_oklch,var(--primary),white_90%)]" : ""}`}
    >
      <StepCircle index={index} state={state} />
      <span className={`text-sm ${state === "active" ? "font-semibold text-primary" : state === "done" ? "text-slate-700" : "text-slate-400"}`}>
        {label}
      </span>
    </div>
  );
}

function StepCircle({ index, state, label }) {
  return (
    <>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold ${
          state === "active"
            ? "border-primary text-primary"
            : state === "done"
              ? "border-primary bg-primary text-white"
              : "border-slate-300 text-slate-400"
        }`}
      >
        {String(index + 1).padStart(2, "0")}
      </div>
      
    </>
  );
}
