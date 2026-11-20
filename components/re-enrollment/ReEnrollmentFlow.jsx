"use client";

import { BookOpen, ClipboardCheck, CreditCard } from "lucide-react";
import { useSelectedLayoutSegment } from "next/navigation";
import { useTranslations } from "next-intl";
import { StepRow } from "@/components/student-enroll/wizard/EnrollmentWizardShell";
import { useReEnrollmentContext } from "@/hooks/useReEnrollment";
import { SEGMENT_TO_STEP, STEP_LABELS } from "@/utils/reEnrollmentSteps";
import styles from "./ReEnrollmentFlow.module.css";

const ICONS = { PAYMENT: CreditCard, COURSE_SELECTION: BookOpen, REVIEW: ClipboardCheck };

/** Presentation only: eligibility owns the step order and the route owns the active step. */
export function ReEnrollmentFlow({ children }) {
  const t = useTranslations("reEnrollment.flow");
  const segment = useSelectedLayoutSegment();
  const { steps, option } = useReEnrollmentContext();
  const activeStep = SEGMENT_TO_STEP[segment];
  if (!activeStep) return children;
  // STEP_LABELS (utils/reEnrollmentSteps.js) stays English; the step names are reEnrollment.flow.steps.<STEP>.
  const stepLabel = key => (t.has(`steps.${key}`) ? t(`steps.${key}`) : STEP_LABELS[key] || key);
  const displaySteps = steps.map(key => ({ key, label: stepLabel(key), icon: ICONS[key] || ClipboardCheck }));
  const currentIndex = displaySteps.findIndex(step => step.key === activeStep);
  return <div className={styles.flow} data-re-enrollment-flow>
    <header className="mb-6 text-center md:mb-8">
      <h1 className="text-xl font-extrabold sm:text-2xl">{option?.learningProgramLabel ? t("titleWithProgram", { program: option.learningProgramLabel }) : t("title")}</h1>
      {currentIndex >= 0 && <p className="mt-1 text-sm text-slate-500">{t("stepOf", { step: currentIndex + 1, total: displaySteps.length, label: stepLabel(activeStep) })}</p>}
      {currentIndex >= 0 && <nav aria-label={t("progress")}>
        <StepRow steps={displaySteps} currentIndex={currentIndex} />
        <ol className="sr-only">{displaySteps.map((step, index) => <li key={step.key} aria-current={index === currentIndex ? "step" : undefined}>{t("stepState", { label: step.label, state: index < currentIndex ? "done" : index === currentIndex ? "current" : "upcoming" })}</li>)}</ol>
      </nav>}
    </header>
    {children}
  </div>;
}

export function ReEnrollmentStepTitle({ children, subtitle }) {
  return <header className="mb-4 text-center md:mb-6">
    <h2 className="text-xl font-bold sm:text-2xl">{children}</h2>
    {subtitle && <p className="mt-1 text-sm text-primary">{subtitle}</p>}
  </header>;
}

export function ReEnrollmentStepCard({ header, headerRight, children }) {
  return <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
    {header && <header className="flex flex-wrap items-center justify-between gap-2 border-primary bg-primary px-4 py-3 text-white">
      <h3 className="text-base font-semibold">{header}</h3>
      {headerRight && <span className="rounded-md bg-white px-3 py-1 text-sm font-semibold text-primary">{headerRight}</span>}
    </header>}
    <div className="px-4 py-3 text-sm">{children}</div>
  </section>;
}
