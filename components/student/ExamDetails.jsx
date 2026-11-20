"use client";

import { CalendarClock, FileX } from "lucide-react";
import { useTranslations } from "next-intl";
import { K5ExamSheet } from "@/components/k5/pages/K5ExamSheet";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useStudentExaminationDetails } from "@/hooks/useStudentExaminationDetails";

/**
 * Exam Details ("Examination Schedule") — legacy studentExaminationSheetContent.js.
 * A single admin-uploaded PDF viewer, or a friendly "not uploaded yet" message.
 */
export function ExamDetails() {
  const t = useTranslations("exams");
  const tc = useTranslations("common");
  const { context, isK5 } = useDashboardContext();
  const { isLoading, fileUrl } = useStudentExaminationDetails({ schoolUUID: context?.schoolUUID, userId: context?.userId });

  if (isK5) return <K5ExamSheet loading={!context || isLoading} fileUrl={fileUrl} />;

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="flex items-center gap-2 px-1 pb-4">
        <CalendarClock className="h-5 w-5 text-primary" aria-hidden="true" />
        <h1 className="text-lg font-extrabold text-black sm:text-xl">{t("title")}</h1>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        {isLoading ? (
          <div className="flex h-[500px] items-center justify-center text-sm text-black/60">{tc("status.loading")}</div>
        ) : fileUrl ? (
          <iframe src={fileUrl} title={t("frameTitle")} className="h-[500px] w-full rounded-lg border border-slate-200" />
        ) : (
          <div className="flex h-[300px] flex-col items-center justify-center gap-2 text-center">
            <FileX className="h-8 w-8 text-black/30" aria-hidden="true" />
            <p className="text-sm text-black/60">{t("comingSoon")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
