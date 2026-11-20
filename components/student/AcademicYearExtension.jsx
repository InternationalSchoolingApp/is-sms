"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useTranslations } from "next-intl";
import { ArrowLeft, CalendarClock, MessageSquareText } from "lucide-react";
import { FullScreenLoader } from "@/components/common/Loader";
import { K5Extension } from "@/components/k5/pages/K5Extension";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PaymentGatewayPickerModal } from "@/components/student-enroll/PaymentGatewayPickerModal";
import { CheckoutExtraDialogs } from "@/components/common/CheckoutExtraDialogs";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useCartCheckout } from "@/hooks/useCartCheckout";
import { useTalkToUs } from "@/hooks/useTalkToUs";
import { useStudentAcademicYearExtension } from "@/hooks/useStudentAcademicYearExtension";
import { availAcademicYearExtension, getAcademicYearExtensionProceed } from "@/services/dashboardApi";
import { expireSession } from "@/utils/logout";
import { OptimizedImage } from "@/components/common/OptimizedImage";
import { useLabelTranslator } from "@/i18n/labels";

const STATUS_SESSION_OUT = "3";

function courseImage(course, fallback) {
  if (course.imgURl) return course.imgURl;
  if (course.subjectIcon) return `/backend-static-assets/images/subjects/${course.subjectIcon}`;
  return fallback;
}

// The legacy bgColor is a Bootstrap class; every course card uses the theme colour.
function CourseCard({ course, image, onClick, as: Tag = "button" }) {
  const tc = useTranslations("common");
  return (
    <Tag type={Tag === "button" ? "button" : undefined} onClick={onClick} className="block w-full overflow-hidden rounded-lg bg-primary text-left shadow-sm transition hover:shadow-md">
      <OptimizedImage src={image} alt="" width={400} height={300} sizes="(max-width: 640px) 100vw, 50vw" className="aspect-[4/3] h-auto w-full bg-white object-contain p-2" />
      <div className="p-2 text-white">
        <h5 className="text-sm font-semibold sm:text-base">{course.subjectName || tc("status.na")}</h5>
      </div>
    </Tag>
  );
}

function PageTitle({ children }) {
  return (
    <div className="flex items-center gap-2 px-1 pb-4">
      <CalendarClock className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
      <h1 className="text-lg font-extrabold text-black sm:text-xl">{children}</h1>
    </div>
  );
}

// getStudentAcademicYearExtentionDefaultTermsHtml(), minus the school-admin mailbox (a legacy global).
// `term(key, values)` words one term (academicYear.terms.<key>).
function extensionTerms(term, schoolName) {
  return [
    term("consultAdmin"),
    term("maxFourWeeks"),
    term("noOtherForm"),
    term("incomplete"),
    term("nonRefundable"),
    term("checkWebsite", { school: schoolName }),
    term("rightToAmend", { school: schoolName }),
  ];
}

// studentAcademicYearExtentionBuildProceedData(): which of the four descriptions applies.
function buildProceed(response, subjectId) {
  const details = response?.details ?? {};
  const subject = details.academicYearExtension ?? {};
  const data = {
    subjectId: subject.subjectId ?? subjectId,
    subjectName: subject.subjectName || "N/A",
    imgURl: subject.imgURl,
    subjectIcon: subject.subjectIcon,
    extentionAvailStatus: subject.extentionAvailStatus || "N",
    currentExtentionType: subject.currentExtentionType || "",
    extension2CanTakeStatus: subject.extension2CanTakeStatus || "YES",
    extension1Status: details.extension1Status || "Yes",
    extensionCount: subject.extensionCount || 0,
    extentionCost: subject.extentionCost || "50",
    studentStandardId: subject.studentStandardId ?? "",
  };
  data.showNotEligible = data.extension2CanTakeStatus === "NO" || data.extension1Status === "No";
  // English text kept for existing readers; notEligibleKey picks the translated message (academicYear.notEligible.*).
  data.notEligibleKey = data.extension1Status === "No" ? "afterYear" : "notEligible";
  data.notEligibleMessage =
    data.extension1Status === "No"
      ? `You can opt for an extension for ${data.subjectName} after the duration of your academic year is complete.`
      : `You are not eligible to opt for an extension for ${data.subjectName}.`;
  data.showExtension1 = !data.showNotEligible && data.extentionAvailStatus === "N" && data.currentExtentionType === "EXTENSION-1";
  data.showPaidExtension = !data.showNotEligible && !data.showExtension1 && data.extentionAvailStatus === "N";
  return data;
}

function ExtensionDetail({ data, image, busy, afterExtension1, onAvail, onBack }) {
  const t = useTranslations("academicYear");
  const tc = useTranslations("common");
  const talkToUs = useTalkToUs();
  const cost = `USD ${data.extentionCost}`;
  const description = (() => {
    if (data.showNotEligible) {
      return (
        <>
          <p className="font-semibold text-primary">{t(`notEligible.${data.notEligibleKey}`, { subject: data.subjectName })}</p>
          <button type="button" onClick={talkToUs} className="mt-3 flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 font-bold text-white">
            <MessageSquareText className="h-4 w-4" aria-hidden="true" /> {t("contactAdmin")}
          </button>
        </>
      );
    }
    if (data.showExtension1 && !afterExtension1) {
      return (
        <>
          <p className="font-semibold text-primary">
            {t("detail.availedOfOne", { count: data.extensionCount })}
            <br />
            {t("detail.extension1Info")}
          </p>
          <button type="button" disabled={busy} onClick={() => onAvail("EXTENSION-1")} className="mt-3 rounded-lg bg-primary px-4 py-2 font-bold text-white disabled:opacity-50">
            {t("detail.availExtension1")}
          </button>
        </>
      );
    }
    if (data.showExtension1 || data.showPaidExtension) {
      const label = data.showExtension1 ? t("detail.extension2") : t("detail.paidExtension");
      return (
        <>
          <p className="font-semibold text-primary">
            {t("detail.availedOfFour", { count: data.extensionCount, label })}
            <br />
            {t("detail.payToAvail", { cost, label })}
            <br />
            {t("detail.extendedOneWeek", { label })}
          </p>
          <button type="button" disabled={busy} onClick={() => onAvail("EXTENSION-2")} className="mt-3 rounded-lg bg-primary px-4 py-2 font-bold text-white disabled:opacity-50">
            {data.showExtension1 ? t("detail.availExtension2") : t("detail.availPaidExtension")}
          </button>
        </>
      );
    }
    return <p className="font-semibold text-primary">{t("detail.allAvailed", { subject: data.subjectName })}</p>;
  })();

  return (
    <div className="mx-auto w-full">
      <div className="flex items-start justify-between gap-2">
        <PageTitle>{t("detail.title", { subject: data.subjectName })}</PageTitle>
        <button type="button" onClick={onBack} className="flex shrink-0 items-center gap-1 rounded-lg bg-slate-800 px-3 py-2 text-sm font-bold text-white">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {tc("actions.back")}
        </button>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-[14rem_1fr]">
          <div className="w-full max-w-[14rem]">
            <CourseCard as="div" course={data} image={image} />
          </div>
          <div className="text-black">
            <h2 className="mb-2 text-lg font-bold">{data.subjectName}</h2>
            {description}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Course Extension (sidebar pageLink academic-year-extention) — legacy studentAcademicYearExtention.js
 * + studentAcademicYearExtentionContent.js: the course list, then per course the extension screen.
 * Extension-1 (free, 2 weeks) is confirmed and availed in place; the paid extension raises an
 * EXTENSION_FEE payment, shows the Terms and Conditions and runs the shared payment-gateway flow
 * (useCartCheckout), as the cart does.
 */
export function AcademicYearExtension() {
  const t = useTranslations("academicYear");
  const tc = useTranslations("common");
  const tm = useLabelTranslator("academicYear.messages");
  const { context, logoUrl, isK5 } = useDashboardContext();
  const { schoolUUID, userId } = context ?? {};
  const { isLoading, message, courses, refetch } = useStudentAcademicYearExtension({ schoolUUID, userId });
  const [proceeding, setProceeding] = useState(false);
  const [selected, setSelected] = useState(null);
  const [afterExtension1, setAfterExtension1] = useState(false);
  const [confirmExtension1, setConfirmExtension1] = useState(false);
  const [availing, setAvailing] = useState(false);
  const [terms, setTerms] = useState(null);
  const [agreed, setAgreed] = useState(false);
  const checkout = useCartCheckout({
    context,
    onPaid: () => {
      setTerms(null);
      setSelected(null);
      refetch();
      toast.success(t("toast.paymentReceived"));
    },
  });

  async function openCourse(course) {
    if (proceeding) return;
    setProceeding(true);
    try {
      const response = await getAcademicYearExtensionProceed({ schoolUUID, userId, subjectId: course.subjectId });
      if (!response) {
        toast.error(tc("status.somethingWentWrong"));
        return;
      }
      if (String(response.status) === STATUS_SESSION_OUT) {
        expireSession(schoolUUID);
        return;
      }
      setAfterExtension1(false);
      setSelected({ data: buildProceed(response, course.subjectId), image: courseImage(response.details?.academicYearExtension ?? course, logoUrl) });
    } finally {
      setProceeding(false);
    }
  }

  async function avail(type) {
    if (availing) return;
    setConfirmExtension1(false);
    setAvailing(true);
    try {
      const response = await availAcademicYearExtension({
        schoolUUID,
        userId,
        studentStandardId: selected.data.studentStandardId,
        subjectId: selected.data.subjectId,
        currentExtentionType: type,
      });
      if (String(response?.status) === STATUS_SESSION_OUT) {
        expireSession(schoolUUID);
        return;
      }
      // Success is statusCode "1" (status stays "0" in this backend method).
      if (String(response?.statusCode) !== "1") {
        toast.error(response?.message || t("toast.unableToAvail"));
        return;
      }
      if (type === "EXTENSION-1") {
        toast.success(response.details?.message || response.message || t("toast.extension1Availed"));
        setAfterExtension1(true);
        return;
      }
      const upid = response.details?.userPaymentDetailsId;
      if (!upid) {
        toast.error(t("toast.unableToAvail"));
        return;
      }
      setAgreed(false);
      setTerms({ userPaymentDetailsId: upid });
    } catch (err) {
      console.error("academic-year-extention-avail failed:", err);
      toast.error(tc("status.somethingWentWrong"));
    } finally {
      setAvailing(false);
    }
  }

  const busy = availing || checkout.preparing;
  const schoolName = context?.schoolName || t("schoolFallback");

  return (
    <>
      {isK5 ? (
        <K5Extension
          loading={!context || isLoading}
          message={message}
          courses={courses}
          imageOf={(course) => courseImage(course, logoUrl)}
          onOpen={openCourse}
          selected={selected}
          afterExtension1={afterExtension1}
          busy={busy}
          onAvail={(type) => (type === "EXTENSION-1" ? setConfirmExtension1(true) : avail(type))}
          onBack={() => setSelected(null)}
        />
      ) : selected ? (
        <ExtensionDetail
          data={selected.data}
          image={selected.image}
          busy={busy}
          afterExtension1={afterExtension1}
          onAvail={(type) => (type === "EXTENSION-1" ? setConfirmExtension1(true) : avail(type))}
          onBack={() => setSelected(null)}
        />
      ) : (
        <div className="mx-auto w-full">
          <PageTitle>{t("title")}</PageTitle>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            {!context || isLoading ? (
              <p className="py-8 text-center text-lg font-bold text-primary">{tc("status.loading")}</p>
            ) : (
              <>
                <h2 className="mb-4 text-center text-lg font-bold text-primary sm:text-xl">{tm(message) || tc("status.na")}</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {courses.map((course) => (
                    <CourseCard key={course.subjectId} course={course} image={courseImage(course, logoUrl)} onClick={() => openCourse(course)} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <Dialog open={confirmExtension1} onOpenChange={setConfirmExtension1}>
        <DialogContent className="text-center sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("confirmExtension1")}</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center gap-3">
            <button type="button" onClick={() => setConfirmExtension1(false)} className="rounded-lg bg-red-600 px-5 py-2 font-bold text-white">
              {tc("actions.no")}
            </button>
            <button type="button" onClick={() => avail("EXTENSION-1")} className="rounded-lg bg-green-600 px-5 py-2 font-bold text-white">
              {tc("actions.yes")}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(terms) && !checkout.picker} onOpenChange={(open) => !open && setTerms(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t("termsTitle")}</DialogTitle>
          </DialogHeader>
          <p className="font-bold text-black">{t("termsIntro")}</p>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-black">
            {extensionTerms((key, values) => t(`terms.${key}`, values), schoolName).map((term) => (
              <li key={term}>{term}</li>
            ))}
          </ol>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3">
            <label className="flex flex-1 cursor-pointer items-start gap-2 text-sm text-black">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-4 w-4" />
              {t("agree")}
            </label>
            <button
              type="button"
              disabled={!agreed || checkout.preparing}
              onClick={() => checkout.start(terms.userPaymentDetailsId)}
              className="rounded-lg bg-green-600 px-5 py-2 font-bold text-white disabled:opacity-50"
            >
              {checkout.preparing ? tc("status.pleaseWait") : t("payNow")}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <CheckoutExtraDialogs checkout={checkout} />
      {context && (
        <PaymentGatewayPickerModal
          open={Boolean(checkout.picker)}
          onOpenChange={(open) => !open && checkout.closePicker()}
          details={checkout.picker?.details}
          airwallexMethods={checkout.picker?.methods}
          payerCountryCode={checkout.picker?.countryCode}
          schoolNumericId={context.schoolNumericId}
          schoolName={context.schoolName}
          busy={checkout.launching}
          onPay={checkout.launchGateway}
          onUploadProof={checkout.uploadProof}
          onSubmitOffline={checkout.submitOffline}
        />
      )}
      {(proceeding || availing || checkout.preparing || checkout.processing) && (
        <FullScreenLoader message={checkout.processing ? t("paymentProcessing") : undefined} />
      )}
      <Dialog open={checkout.incomplete} onOpenChange={(open) => !open && checkout.dismissIncomplete()}>
        <DialogContent className="text-center">
          <DialogHeader>
            <DialogTitle className="text-2xl">{t("oops")}</DialogTitle>
          </DialogHeader>
          <h3 className="text-lg font-semibold text-red-600">{t("paymentIncomplete")}</h3>
        </DialogContent>
      </Dialog>
      <Dialog
        open={checkout.underReview}
        onOpenChange={(open) => {
          if (open) return;
          checkout.dismissUnderReview();
          setTerms(null);
          setSelected(null);
          refetch();
        }}
      >
        <DialogContent className="text-center">
          <DialogHeader>
            <DialogTitle>{t("underReviewTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-black/70">{t("underReviewText")}</p>
        </DialogContent>
      </Dialog>
    </>
  );
}
