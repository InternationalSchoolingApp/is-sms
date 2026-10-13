"use client";

import { useState } from "react";
import Image from "next/image";
import { LogOut } from "lucide-react";
import { Footer } from "@/components/common/Footer";
import { LogoutConfirmDialog } from "@/components/student-enroll/wizard/LogoutConfirmDialog";

/**
 * Page frame of the re-enrollment screens: the light dashboard background, a plain header with the school
 * logo and the student's Log Off, and the copyright footer. No enrollment stepper or hero: the re-enrollment
 * keeps the look of the student dashboard it came from.
 */
export function ReEnrollmentShell({ schoolName, logoUrl, studentName, onLogout, embed = false, children }) {
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Inside the dashboard (iframe): no header, no footer, the dashboard around it provides them.
  if (embed) {
    return <main className="mx-auto w-full max-w-[1310px] px-4 pb-24 pt-2 sm:px-6">{children}</main>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f1f4f6]">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white px-4 py-2.5 shadow-sm sm:px-6">
        <div className="mx-auto flex max-w-[1310px] items-center justify-between gap-3">
          {logoUrl ? (
            <Image src={logoUrl} alt={schoolName || ""} width={160} height={36} className="h-9 w-auto max-w-[160px] sm:max-w-[220px]" unoptimized />
          ) : (
            <p className="text-sm font-bold text-black">{schoolName || "International Schooling"}</p>
          )}
          <div className="flex items-center gap-3">
            {studentName && <span className="hidden text-sm font-semibold text-slate-700 sm:inline">{studentName}</span>}
            <button
              type="button"
              onClick={() => setConfirmLogout(true)}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-red-600 px-2.5 py-1.5 text-sm font-semibold text-white duration-150 hover:bg-red-700"
            >
              <LogOut className="h-4 w-4 stroke-3" /> Log Off
            </button>
          </div>
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

      <main className="mx-auto w-full max-w-[1310px] flex-1 px-4 pb-24 pt-2 sm:px-6">{children}</main>
      <Footer schoolName={schoolName} inFlow />
      <Footer schoolName={schoolName} fixed />
    </div>
  );
}
