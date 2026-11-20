"use client";

import { useState, useRef, useEffect } from "react";
import { Award, FileX, GraduationCap, MoreVertical } from "lucide-react";
import { useTranslations } from "next-intl";
import { K5Transcript } from "@/components/k5/pages/K5Transcript";
import { MobileTableCard } from "@/components/student/MobileTableCard";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useModuleRights } from "@/hooks/useModuleRights";
import { useStudentTranscriptStatus } from "@/hooks/useStudentTranscriptStatus";
import { transcriptLinks } from "@/utils/transcriptLinks";

function ActionDropdown({ links }) {
  const t = useTranslations("transcript");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function close(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  if (!links.length) return <span className="text-xs text-black/40">--</span>;

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-white transition-colors hover:bg-primary/90"
        aria-label={t("actionsLabel")}
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 min-w-[180px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {links.map((link) => (
            <a
              key={link.key}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              onClick={() => setOpen(false)}
            >
              {link.kind === "diploma" ? <GraduationCap className="h-4 w-4 text-primary/60" aria-hidden="true" /> : <Award className="h-4 w-4 text-primary/60" aria-hidden="true" />}
              {link.kind === "diploma"
                ? t("links.diploma", { grade: link.grade })
                : link.isNew
                  ? t("links.transcriptNew", { grade: link.grade })
                  : t("links.transcript", { grade: link.grade })}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export function Transcript() {
  const t = useTranslations("transcript");
  const tc = useTranslations("common");
  const { context, isK5 } = useDashboardContext();
  const { isLoading, student, transcripts } = useStudentTranscriptStatus({
    schoolUUID: context?.schoolUUID,
    userId: context?.userId,
  });

  // Legacy: the transcript links are only listed when the module's viewed right is "Y" (roleAndModule.viewed).
  const { waiting, canView } = useModuleRights("student-transcript");
  const links = waiting || canView ? transcriptLinks(transcripts) : [];

  if (isK5) return <K5Transcript isLoading={isLoading} student={student} transcripts={transcripts} links={links} />;

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="flex items-center gap-2 px-1 pb-4">
        <Award className="h-5 w-5 text-primary" aria-hidden="true" />
        <h1 className="text-lg font-extrabold text-black sm:text-xl">{t("title")}</h1>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white">
        {isLoading ? (
          <div className="flex h-[200px] items-center justify-center text-sm text-black/60">{tc("status.loading")}</div>
        ) : student ? (
          <>
            {/* Mobile: the record as one card (column title beside each value). */}
            <div className="px-4 pt-4 md:hidden">
              <MobileTableCard
                rows={[
                  { label: t("table.sNo"), value: 1 },
                  { label: t("table.studentName"), value: student.name },
                  { label: t("table.email"), value: student.email },
                  { label: t("table.grade"), value: student.grade },
                  { label: t("table.studentId"), value: student.rollNumber },
                  { label: t("table.action"), value: <ActionDropdown links={links} /> },
                ]}
              />
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-primary text-white">
                    <th className="whitespace-nowrap px-4 py-2.5 font-semibold">{t("table.sNo")}</th>
                    <th className="whitespace-nowrap px-4 py-2.5 font-semibold">{t("table.studentName")}</th>
                    <th className="whitespace-nowrap px-4 py-2.5 font-semibold">{t("table.email")}</th>
                    <th className="whitespace-nowrap px-4 py-2.5 font-semibold">{t("table.grade")}</th>
                    <th className="whitespace-nowrap px-4 py-2.5 font-semibold">{t("table.studentId")}</th>
                    <th className="whitespace-nowrap px-4 py-2.5 text-center font-semibold">{t("table.action")}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-slate-100">
                    <td className="px-4 py-2.5">1</td>
                    <td className="px-4 py-2.5">{student.name}</td>
                    <td className="px-4 py-2.5">{student.email}</td>
                    <td className="px-4 py-2.5">{student.grade}</td>
                    <td className="px-4 py-2.5">{student.rollNumber}</td>
                    <td className="px-4 py-2.5 text-center">
                      <ActionDropdown links={links} />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2 text-xs text-black/50">{tc("table.showingEntries", { from: 1, to: 1, total: 1 })}</div>
          </>
        ) : (
          <div className="flex h-[200px] flex-col items-center justify-center gap-2 text-center">
            <FileX className="h-8 w-8 text-black/30" aria-hidden="true" />
            <p className="text-sm text-black/60">{t("notPublished")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
