"use client";

import { useState, useRef, useEffect } from "react";
import { Award, FileX, MoreVertical } from "lucide-react";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useStudentTranscriptStatus } from "@/hooks/useStudentTranscriptStatus";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_BASE_URL || "";

function ActionDropdown({ transcripts }) {
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

  if (!transcripts.length) return <span className="text-xs text-black/40">--</span>;

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-white transition-colors hover:bg-primary/90"
        aria-label="Transcript actions"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 min-w-[180px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {transcripts.map((t, i) => (
            <a
              key={i}
              href={`${BACKEND_URL}${t.viewPath}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              onClick={() => setOpen(false)}
            >
              <Award className="h-4 w-4 text-primary/60" aria-hidden="true" />
              Transcript - {t.gradeName}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export function Transcript() {
  const { context } = useDashboardContext();
  const { isLoading, student, transcripts } = useStudentTranscriptStatus({
    schoolUUID: context?.schoolUUID,
    userId: context?.userId,
  });

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="flex items-center gap-2 px-1 pb-4">
        <Award className="h-5 w-5 text-primary" aria-hidden="true" />
        <h1 className="text-lg font-extrabold text-black sm:text-xl">Student Transcript</h1>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white">
        {isLoading ? (
          <div className="flex h-[200px] items-center justify-center text-sm text-black/60">Loading…</div>
        ) : student ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-primary text-white">
                  <th className="whitespace-nowrap px-4 py-2.5 font-semibold">S. No.</th>
                  <th className="whitespace-nowrap px-4 py-2.5 font-semibold">Student Name</th>
                  <th className="whitespace-nowrap px-4 py-2.5 font-semibold">Email</th>
                  <th className="whitespace-nowrap px-4 py-2.5 font-semibold">Grade</th>
                  <th className="whitespace-nowrap px-4 py-2.5 font-semibold">Student ID</th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-center font-semibold">Action</th>
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
                    <ActionDropdown transcripts={transcripts} />
                  </td>
                </tr>
              </tbody>
            </table>
            <div className="px-4 py-2 text-xs text-black/50">
              Showing 1 to 1 of 1 entries
            </div>
          </div>
        ) : (
          <div className="flex h-[200px] flex-col items-center justify-center gap-2 text-center">
            <FileX className="h-8 w-8 text-black/30" aria-hidden="true" />
            <p className="text-sm text-black/60">Your transcript has not been published yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
