"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useTranslations } from "next-intl";
import { ArrowRight, CalendarDays, Headphones, Info, Mail, MessageCircle, Phone } from "lucide-react";
import { FullScreenLoader } from "@/components/common/Loader";
import { ActionButton, CHAT_BASE_URL, SUPPORT_EMAIL, SUPPORT_PHONE } from "@/components/re-enrollment/ReEnrollmentParts";
import { STATUS_SUCCESS, useReEnrollmentContext, useSelectReEnrollmentOption } from "@/hooks/useReEnrollment";
import { expireSession } from "@/utils/logout";
import { reEnrollmentStepPath } from "@/utils/reEnrollmentSteps";

import { useDashboardContext } from "@/hooks/useDashboardContext";
import { K5PassedOptions } from "./K5PassedOptions";
import { usePicoContentReady } from "@/components/k5/pico/picoEvents";
import { useLocaleTag } from "@/i18n/dateLocale";

const pad = (n) => String(n);

// Early re-enrollment offer card: saving amount, "Offer Ends on" date and the DAYS : HRS : MIN : SEC countdown.
function DiscountBanner({ discount }) {
  const t = useTranslations("reEnrollment.options");
  const tag = useLocaleTag();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const remaining = Math.max(0, discount.dueDateMillis - now);
  if (remaining <= 0 && !discount.amount) return null;
  const parts = [
    { label: t("countdown.days"), value: Math.floor(remaining / 86400000) },
    { label: t("countdown.hrs"), value: Math.floor((remaining % 86400000) / 3600000) },
    { label: t("countdown.min"), value: Math.floor((remaining % 3600000) / 60000) },
    { label: t("countdown.sec"), value: Math.floor((remaining % 60000) / 1000) },
  ];
  const endsOn = new Date(discount.dueDateMillis).toLocaleDateString(tag === "en-US" ? "en-GB" : tag, { day: "numeric", month: "short", year: "numeric" });
  return (
    <div className="overflow-hidden rounded-2xl border border-green-300 bg-white">
      <div className="px-4 py-4 text-center">
        <p className="text-base font-medium text-green-600">{t("offerTitle")}</p>
        <p className="mt-1 text-3xl font-extrabold text-slate-900">
          {t("save", { amount: `${discount.currencyLabel ? `${discount.currencyLabel} ` : ""}${discount.amount}` })}
        </p>
        <p className="mt-1 text-sm text-slate-500 sm:text-base">{t("offerText")}</p>
      </div>
      {remaining > 0 && (
        <div className="flex flex-row items-center justify-between gap-2 border-t border-green-300 bg-green-50 px-3 py-3 sm:px-4">
          <div className="flex items-center gap-2 text-slate-800">
            <CalendarDays className="h-5 w-5 shrink-0 text-green-700" aria-hidden="true" />
            <div className="leading-tight">
              <p className="text-sm">{t("offerEnds")}</p>
              <p className="text-base font-bold">{endsOn}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5" aria-label={t("countdownLabel")}>
            {parts.map((part, index) => (
              <div key={part.label} className="flex items-center gap-1 sm:gap-1.5">
                <div className="min-w-[38px] rounded-lg border border-green-300 bg-white px-1 py-1 sm:min-w-[46px] sm:px-1.5 text-center leading-tight">
                  <div className="text-lg font-bold text-slate-900">{pad(part.value)}</div>
                  <div className="text-[10px] font-semibold text-slate-700">{part.label}</div>
                </div>
                {index < parts.length - 1 && <span className="text-lg font-bold text-slate-800">:</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StepList({ grade, hasDiscount, discountText }) {
  const t = useTranslations("reEnrollment.options.steps");
  const steps = [
    { title: t("reviewTitle"), text: hasDiscount ? t("reviewDiscount", { amount: discountText }) : t("reviewText") },
    { title: t("payTitle"), text: t("payText") },
    { title: t("coursesTitle"), text: t("coursesText") },
    { title: t("dateTitle"), text: grade ? t("dateText", { grade }) : t("dateTextNoGrade") },
  ];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-base font-bold text-slate-900">{t("heading")}</h3>
        <span className="flex items-center gap-1 text-sm font-medium text-primary">
          <Info className="h-4 w-4" aria-hidden="true" />
          {t("duration")}
        </span>
      </div>
      <ol className="grid gap-3 sm:grid-cols-2">
        {steps.map((step, index) => (
          <li key={step.title} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">{index + 1}</span>
            <div>
              <p className="font-bold text-slate-900">{step.title}</p>
              <p className="text-sm text-slate-600">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function HelpCard({ uniqueId }) {
  const t = useTranslations("reEnrollment.support");
  const chatUrl = `${CHAT_BASE_URL}/onboarding-support?uuid=${encodeURIComponent(uniqueId || "")}`;
  return (
    <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h4 className="mb-4 flex items-center gap-3 text-lg font-bold text-slate-900">
        <Headphones className="h-6 w-6 text-primary" aria-hidden="true" />
        {t("needHelp")}
      </h4>
      <a
        href={chatUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mb-3 flex items-center gap-3 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white transition-transform hover:scale-[1.02]"
      >
        <MessageCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
        {t("liveChat")}
      </a>
      <div className="mb-3 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
        <Phone className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <p className="font-semibold text-slate-900">{t("phone")}</p>
          <p className="text-slate-600">{SUPPORT_PHONE}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
        <Mail className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0">
          <p className="font-semibold text-slate-900">{t("email")}</p>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="break-words text-slate-600">
            {SUPPORT_EMAIL}
          </a>
        </div>
      </div>
    </aside>
  );
}

// Button text of each option, as the legacy re-enrollment page words them: reEnrollment.options.buttons.<enrollmentType>.
const OPTION_BUTTON = {
  REGISTRATION_NEXT_GRADE: "buttons.REGISTRATION_NEXT_GRADE",
  REGISTRATION_REPEAT_GRADE: "buttons.REGISTRATION_REPEAT_GRADE",
  REGISTRATION_IMPORVE_GRADES: "buttons.REGISTRATION_IMPORVE_GRADES",
};

/**
 * Learning programs the student may move into for one option (Re-enrollment Specs for Flow: "Any", Take an Individual Course
 * without Group, ...), the default one pre-selected. A single program is just named under the button.
 */
function ProgramChips({ option, selected, disabled, onSelect }) {
  const t = useTranslations("reEnrollment.options");
  const programs = option.programs || [];
  if (programs.length <= 1) {
    return option.learningProgramLabel ? <p className="mt-1 text-xs font-semibold text-slate-500">{option.learningProgramLabel}</p> : null;
  }
  return (
    <div className="mt-2 flex max-w-[420px] flex-wrap justify-center gap-1.5" role="radiogroup" aria-label={t("learningProgram")}>
      {programs.map((program) => {
        const active = program.learningProgram === selected;
        return (
          <button
            key={program.learningProgram}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onSelect(program.learningProgram)}
            className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold duration-150 disabled:cursor-not-allowed disabled:opacity-60 ${
              active ? "border-primary bg-primary text-white" : "border-slate-300 bg-white text-slate-600 hover:border-primary hover:text-primary"
            }`}
          >
            {program.learningProgramLabel || program.learningProgram}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Entry screen of the re-enrollment, laid out like the legacy student re-enrollment page: the student's name in a
 * page title bar, a big result card (promoted / "Don't give up") with the option buttons, and the
 * "Need Support?" card on the right. A student who already selected an option goes straight to the screen to
 * resume at (currentStep).
 */
export function ReEnrollmentOptions() {
  const t = useTranslations("reEnrollment.options");
  const tc = useTranslations("common");
  const { isK5, isMiddle, isHigh } = useDashboardContext();
  const router = useRouter();
  const { school } = useParams();
  const { session, context, eligibility, inProgress } = useReEnrollmentContext();
  const select = useSelectReEnrollmentOption({ context, userId: session.userId });
  // resume=1 (login / coming back from the payment): continue at the step the student is on instead of showing the options.
  const [resume] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("resume") === "1");
  const [pickedPrograms, setPickedPrograms] = useState({});
  usePicoContentReady(!(resume && inProgress));

  useEffect(() => {
    if (resume && inProgress && eligibility.currentStep) router.replace(reEnrollmentStepPath(school, eligibility.currentStep));
  }, [resume, inProgress, eligibility.currentStep, router, school]);

  if (resume && inProgress) return <FullScreenLoader />;

  const passed = eligibility.result === "PASS";
  const completedGrade12 = passed && /^grade\s*12$/i.test(eligibility.currentGrade?.name?.trim() || "");
  const options = eligibility.options || [];
  // The learning program picked under each option; the option's default (first in `programs`) until the student picks another.
  const programOf = (option) => completedGrade12 && option.enrollmentType === "REGISTRATION_IMPORVE_GRADES"
    ? "ONE_TO_ONE_FLEX"
    : pickedPrograms[option.enrollmentType] ?? option.learningProgram;

  async function choose(option) {
    if (select.isPending) return;
    try {
      const response = await select.mutateAsync({ enrollmentType: option.enrollmentType, learningProgram: programOf(option) });
      if (!response) {
        toast.error(t("genericError"));
      } else if (response.status === "3") {
        expireSession(school);
      } else if (response.status !== STATUS_SUCCESS) {
        toast.error(response.message || t("selectFailed"));
      } else {
        router.push(reEnrollmentStepPath(school, response.nextStep));
      }
    } catch (err) {
      console.error("ReEnrollmentOptions select-option failed:", err);
      toast.error(t("genericError"));
    }
  }

  // "Promoted to" names the Next Grade's grade (a grade 12 pass has no Next Grade, only Take an Individual Course).
  const nextGradeName = options.find((option) => option.enrollmentType === "REGISTRATION_NEXT_GRADE")?.grade?.name;
  const grade = nextGradeName || options.find((option) => option.enrollmentType === "REGISTRATION_REPEAT_GRADE")?.grade?.name;
  // Passed a grade with no Next Grade (grade 12): the options are Repeat / Take an Individual Course, same as after a fail,
  // so the card says the grade is completed instead of "promoted" (pass) or "Don't give up" (fail).
  const completedGrade = passed && !nextGradeName ? eligibility.currentGrade?.name || grade : null;
  const discount = eligibility.progressionDiscount;
  const hasDiscount = passed && discount?.amount > 0;
  const discountText = hasDiscount ? `${discount.currencyLabel ? `${discount.currencyLabel} ` : ""}${discount.amount}` : "";

  if (isK5) {
    return <K5PassedOptions
      passed={passed}
      isMiddle={isMiddle}
      isHigh={isHigh}
      studentName={eligibility.studentName}
      // A pass names the grade moved up to; a grade 12 pass has none and its card says the current grade is completed.
      grade={passed ? nextGradeName : grade}
      currentGrade={eligibility.currentGrade?.name}
      academicYear={eligibility.academicYear || "2027–28"}
      discount={discount}
      options={options}
      uniqueId={session.uniqueId}
      pending={select.isPending}
      pendingType={select.variables?.enrollmentType}
      choose={choose}
      programOf={programOf}
    />;
  }

  const optionButtons = (
    <div className="flex flex-col items-center gap-4">
      {options.map((option) => (
        <div key={option.enrollmentType} className="w-full text-center sm:w-auto">
          <ActionButton
            onClick={() => choose(option)}
            disabled={select.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-8 py-3.5 text-lg font-semibold sm:min-w-[280px]"
          >
            {select.isPending && select.variables?.enrollmentType === option.enrollmentType ? tc("status.pleaseWait") : OPTION_BUTTON[option.enrollmentType] ? t(OPTION_BUTTON[option.enrollmentType]) : tc("actions.continue")}
            {!(select.isPending && select.variables?.enrollmentType === option.enrollmentType) && <ArrowRight className="h-5 w-5" aria-hidden="true" />}
          </ActionButton>
          <ProgramChips
            option={option}
            selected={programOf(option)}
            disabled={select.isPending}
            onSelect={(program) => setPickedPrograms((current) => ({ ...current, [option.enrollmentType]: program }))}
          />
        </div>
      ))}
    </div>
  );

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-4 lg:grid-cols-[2fr_1fr] lg:items-start">
      <div className="flex flex-col gap-4">
        {completedGrade ? (
          <div className="rounded-2xl bg-gradient-to-r from-[#0a7cf0] to-[#0057b8] px-4 py-6 text-center text-white shadow-lg">
            <p className="inline-block rounded-full bg-white/20 px-6 py-2 text-md font-bold sm:text-md">{t("congrats", { name: eligibility.studentName ?? "" })}</p>
            <h2 className="mt-4 text-3xl font-extrabold leading-tight sm:text-3xl">{t("completed", { grade: completedGrade })}</h2>
            <p className="mt-2 text-base font-semibold text-white/90">{t("completedText")}</p>
          </div>
        ) : passed ? (
          <div className="rounded-2xl bg-gradient-to-r from-[#0a7cf0] to-[#0057b8] px-4 py-6 text-center text-white shadow-lg">
            <p className="inline-block rounded-full bg-white/20 px-6 py-2 text-md font-bold sm:text-md">{t("congrats", { name: eligibility.studentName ?? "" })}</p>
            <h2 className="mt-4 text-3xl font-extrabold leading-tight sm:text-3xl">
              {grade ? t("promotedTo", { grade }) : t("promoted")}
            </h2>
          </div>
        ) : (
          <div className="rounded-2xl bg-white px-4 py-6 text-center shadow-sm">
            <h2 className="mb-2 text-[28px] font-bold text-black">{t("dontGiveUp")}</h2>
            <h6 className="text-lg font-bold text-slate-500">{t("dontGiveUpText")}</h6>
          </div>
        )}

        {hasDiscount && <DiscountBanner discount={discount} />}

        {passed && !completedGrade && <StepList grade={grade} hasDiscount={hasDiscount} discountText={discountText} />}

        <div className="py-2">{optionButtons}</div>
      </div>
      <HelpCard uniqueId={session.uniqueId} />
    </div>
  );
}
