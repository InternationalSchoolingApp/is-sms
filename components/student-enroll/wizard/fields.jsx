"use client";

/**
 * Layout-only primitives for the sidebar wizard design (EnrollmentWizardShell
 * + Stage1StudentDetails). The actual field inputs reuse the app's existing
 * floating-label components (components/ui/floating-label-*.jsx, DatePicker,
 * PhoneNumberField) directly — see Stage1StudentDetails.jsx — so every form
 * in the app behaves and looks the same; this file only holds the section
 * divider.
 */
export function SectionHeading({ children }) {
  return (
    <div className="mb-4 mt-8 flex items-center gap-3 first:mt-0">
      <h3 className="shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-500">{children}</h3>
      <div className="h-px flex-1 bg-slate-200" />
    </div>
  );
}
