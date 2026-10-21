"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ArrowRight, CalendarDays, Headphones, Info, Mail, MessageCircle, Phone } from "lucide-react";
import { FullScreenLoader } from "@/components/common/Loader";
import { ActionButton, CHAT_BASE_URL, SUPPORT_EMAIL, SUPPORT_PHONE } from "@/components/re-enrollment/ReEnrollmentParts";
import { STATUS_SUCCESS, useReEnrollmentContext, useSelectReEnrollmentOption } from "@/hooks/useReEnrollment";
import { expireSession } from "@/utils/logout";
import { reEnrollmentStepPath } from "@/utils/reEnrollmentSteps";

const pad = (n) => String(n);

// Early re-enrollment offer card: saving amount, "Offer Ends on" date and the DAYS : HRS : MIN : SEC countdown.
function DiscountBanner({ discount }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const remaining = Math.max(0, discount.dueDateMillis - now);
  if (remaining <= 0 && !discount.amount) return null;
  const parts = [
    { label: "DAYS", value: Math.floor(remaining / 86400000) },
    { label: "HRS", value: Math.floor((remaining % 86400000) / 3600000) },
    { label: "MIN", value: Math.floor((remaining % 3600000) / 60000) },
    { label: "SEC", value: Math.floor((remaining % 60000) / 1000) },
  ];
  const endsOn = new Date(discount.dueDateMillis).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  return (
    <div className="overflow-hidden rounded-2xl border border-green-300 bg-white">
      <div className="px-4 py-4 text-center">
        <p className="text-base font-medium text-green-600">Early re-enrollment offer</p>
        <p className="mt-1 text-3xl font-extrabold text-slate-900">
          Save {discount.currencyLabel ? `${discount.currencyLabel} ` : ""}
          {discount.amount}
        </p>
        <p className="mt-1 text-sm text-slate-500 sm:text-base">when you re-enroll before the offer ends</p>
      </div>
      {remaining > 0 && (
        <div className="flex flex-row items-center justify-between gap-2 border-t border-green-300 bg-green-50 px-3 py-3 sm:px-4">
          <div className="flex items-center gap-2 text-slate-800">
            <CalendarDays className="h-5 w-5 shrink-0 text-green-700" aria-hidden="true" />
            <div className="leading-tight">
              <p className="text-sm">Offer Ends on:</p>
              <p className="text-base font-bold">{endsOn}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5" aria-label="Offer countdown">
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
  const steps = [
    { title: "Review fee & pick a plan", text: hasDiscount ? `Your ${discountText} saving is applied here` : "Choose the plan that suits you" },
    { title: "Pay securely", text: "One payment for the whole year" },
    { title: "Choose your courses", text: "Core courses are already added for you" },
    { title: "Choose academic date", text: `Choose when ${grade || "the next grade"} begins, and you're done` },
  ];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-base font-bold text-slate-900">4 easy steps</h3>
        <span className="flex items-center gap-1 text-sm font-medium text-primary">
          <Info className="h-4 w-4" aria-hidden="true" />
          About 5 Minutes
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
  const chatUrl = `${CHAT_BASE_URL}/onboarding-support?uuid=${encodeURIComponent(uniqueId || "")}`;
  return (
    <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h4 className="mb-4 flex items-center gap-3 text-lg font-bold text-slate-900">
        <Headphones className="h-6 w-6 text-primary" aria-hidden="true" />
        Need Help?
      </h4>
      <a
        href={chatUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mb-3 flex items-center gap-3 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white transition-transform hover:scale-[1.02]"
      >
        <MessageCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
        Live Chat with School Administration
      </a>
      <div className="mb-3 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
        <Phone className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <p className="font-semibold text-slate-900">Phone Support</p>
          <p className="text-slate-600">{SUPPORT_PHONE}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
        <Mail className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0">
          <p className="font-semibold text-slate-900">Email Support</p>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="break-words text-slate-600">
            {SUPPORT_EMAIL}
          </a>
        </div>
      </div>
    </aside>
  );
}

const GENERIC_ERROR = "Something went wrong. Please check your connection and try again.";

// Button text of each option, as the legacy re-enrollment page words them.
const OPTION_BUTTON = {
  REGISTRATION_NEXT_GRADE: "Re-Enroll Today",
  REGISTRATION_REPEAT_GRADE: "Repeat the entire grade",
  REGISTRATION_IMPORVE_GRADES: "Take an individual course",
};

/**
 * Entry screen of the re-enrollment, laid out like the legacy student re-enrollment page: the student's name in a
 * page title bar, a big result card (promoted / "Don't give up") with the option buttons, and the
 * "Need Support?" card on the right. A student who already selected an option goes straight to the screen to
 * resume at (currentStep).
 */
export function ReEnrollmentOptions() {
  const router = useRouter();
  const { school, mode } = useParams();
  const { session, context, eligibility, inProgress } = useReEnrollmentContext();
  const select = useSelectReEnrollmentOption({ context, userId: session.userId });
  // resume=1 (login / coming back from the payment): continue at the step the student is on instead of showing the options.
  const [resume] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("resume") === "1");

  useEffect(() => {
    if (resume && inProgress && eligibility.currentStep) router.replace(reEnrollmentStepPath(school, eligibility.currentStep, mode));
  }, [resume, inProgress, eligibility.currentStep, router, school, mode]);

  if (resume && inProgress) return <FullScreenLoader />;

  const passed = eligibility.result === "PASS";
  const options = eligibility.options || [];

  async function choose(option) {
    if (select.isPending) return;
    try {
      const response = await select.mutateAsync(option.enrollmentType);
      if (!response) {
        toast.error(GENERIC_ERROR);
      } else if (response.status === "3") {
        expireSession(school);
      } else if (response.status !== STATUS_SUCCESS) {
        toast.error(response.message || "Could not select this option. Please try again.");
      } else {
        router.push(reEnrollmentStepPath(school, response.nextStep, mode));
      }
    } catch (err) {
      console.error("ReEnrollmentOptions select-option failed:", err);
      toast.error(GENERIC_ERROR);
    }
  }

  const grade = options[0]?.grade?.name;
  const discount = eligibility.progressionDiscount;
  const hasDiscount = passed && discount?.amount > 0;
  const discountText = hasDiscount ? `${discount.currencyLabel ? `${discount.currencyLabel} ` : ""}${discount.amount}` : "";

  const optionButtons = (
    <div className="flex flex-col items-center gap-4">
      {options.map((option) => (
        <div key={option.enrollmentType} className="w-full text-center sm:w-auto">
          <ActionButton
            onClick={() => choose(option)}
            disabled={select.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-8 py-3.5 text-lg font-semibold sm:min-w-[280px]"
          >
            {select.isPending && select.variables === option.enrollmentType ? "Please wait…" : OPTION_BUTTON[option.enrollmentType] || "Continue"}
            {!(select.isPending && select.variables === option.enrollmentType) && <ArrowRight className="h-5 w-5" aria-hidden="true" />}
          </ActionButton>
          {option.learningProgramLabel && <p className="mt-1 text-xs font-semibold text-slate-500">{option.learningProgramLabel}</p>}
        </div>
      ))}
    </div>
  );

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-4 lg:grid-cols-[2fr_1fr] lg:items-start">
      <div className="flex flex-col gap-4">
        {passed ? (
          <div className="rounded-2xl bg-gradient-to-r from-[#0a7cf0] to-[#0057b8] px-4 py-6 text-center text-white shadow-lg">
            <p className="inline-block rounded-full bg-white/20 px-6 py-2 text-md font-bold sm:text-md">Congratulations, Dear {eligibility.studentName}!</p>
            <h2 className="mt-4 text-3xl font-extrabold leading-tight sm:text-3xl">
              You&apos;ve been promoted{grade ? ` to ${grade}` : ""}
            </h2>
          </div>
        ) : (
          <div className="rounded-2xl bg-white px-4 py-6 text-center shadow-sm">
            <h2 className="mb-2 text-[28px] font-bold text-black">Don&apos;t give up</h2>
            <h6 className="text-lg font-bold text-slate-500">Retake your courses and earn your way to the next grade</h6>
          </div>
        )}

        {hasDiscount && <DiscountBanner discount={discount} />}

        {passed && <StepList grade={grade} hasDiscount={hasDiscount} discountText={discountText} />}

        <div className="py-2">{optionButtons}</div>
      </div>
      <HelpCard uniqueId={session.uniqueId} />
    </div>
  );
}
