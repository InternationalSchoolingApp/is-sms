"use client";

import { useState } from "react";
import { ChevronDown, Eye, Loader2, Pencil } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MobileActionBar } from "@/components/student-enroll/wizard/MobileActionBar";
import { TeacherDemoRecordingViewer } from "@/components/teacher-registration/TeacherDemoRecordingViewer";

// One collapsible section of the review (the legacy accordion): a title, an Edit button that goes back to the step it
// shows, and its rows.
function ReviewSection({ title, open, onToggle, onEdit, disabled, children }) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200">
      <div className="flex items-center justify-between gap-2 bg-slate-50 px-4 py-2.5">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left text-[15px] font-bold text-black"
        >
          <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? "" : "-rotate-90"}`} />
          {title}
        </button>
        <Button type="button" variant="outline" size="sm" onClick={onEdit} disabled={disabled} className="cursor-pointer">
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Button>
      </div>
      {open && <dl className="divide-y divide-slate-100 px-4">{children}</dl>}
    </section>
  );
}

function Row({ label, children }) {
  return (
    <div className="grid grid-cols-1 gap-0.5 py-2.5 sm:grid-cols-[14rem_1fr] sm:gap-4">
      <dt className="text-sm font-semibold text-slate-600">{label}</dt>
      <dd className="min-w-0 text-sm break-words whitespace-pre-wrap text-black">{children || "—"}</dd>
    </div>
  );
}

/**
 * Step 3 ("Review"): the teacher's saved personal and professional details, read only, with an Edit button per section,
 * the documents (opened with View) and the demo (the chosen recording's "Available Recordings", or the saved link). Next
 * asks for confirmation (the legacy "Note"), and Submit sends the profile to the school.
 *
 *   personalRows / professionalRows: [{ label, value }]   documentRows: [{ label, name, url }]
 *   demo: { kind: "link", url } | { kind: "recording", attempt } | { kind: "loading" } | { kind: "none" }
 *   onEdit(step: 1 | 2)   onBack()   onSubmit(): Promise<boolean> (true = sent; the screen then changes by itself)
 */
export function TeacherReview({ context, fullName, personalRows, professionalRows, documentRows, demo, onEdit, onBack, onSubmit }) {
  const [personalOpen, setPersonalOpen] = useState(true);
  const [professionalOpen, setProfessionalOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [viewing, setViewing] = useState(null); // the attempt whose recordings are open

  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onSubmit();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto mt-4 max-w-7xl rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-4 lg:px-8 lg:py-6">
      <h2 className="text-center text-xl font-extrabold text-black md:text-2xl">Demo Under Review</h2>
      <p className="mt-1 text-center text-sm text-slate-600">Kindly Review your details</p>

      <div className="mt-5 flex flex-col gap-3">
        <ReviewSection title="Personal Details" open={personalOpen} onToggle={() => setPersonalOpen((value) => !value)} onEdit={() => onEdit(1)}>
          {personalRows.map((row) => (
            <Row key={row.label} label={row.label}>
              {row.value}
            </Row>
          ))}
        </ReviewSection>

        <ReviewSection title="Professional Details" open={professionalOpen} onToggle={() => setProfessionalOpen((value) => !value)} onEdit={() => onEdit(2)}>
          {professionalRows.map((row) => (
            <Row key={row.label} label={row.label}>
              {row.value}
            </Row>
          ))}
          {documentRows.map((row) => (
            <Row key={row.label} label={row.label}>
              <span className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 truncate" title={row.name}>
                  {row.name}
                </span>
                {row.url && (
                  <a href={row.url} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                    <Eye className="h-4 w-4" /> View
                  </a>
                )}
              </span>
            </Row>
          ))}
          <Row label="Demo Video">
            {demo.kind === "link" && (
              <a href={demo.url} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                <Eye className="h-4 w-4" /> View
              </a>
            )}
            {demo.kind === "recording" && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setViewing(demo.attempt)} className="cursor-pointer">
                <Eye className="h-4 w-4" /> View
              </Button>
            )}
            {demo.kind === "loading" && "Loading…"}
            {demo.kind === "none" && "NA"}
          </Row>
        </ReviewSection>
      </div>

      <MobileActionBar context={null} className="md:mt-6">
        <Button type="button" variant="outline" onClick={onBack} className="cursor-pointer rounded-md px-4">
          Back
        </Button>
        <Button type="button" onClick={() => setNoteOpen(true)} className="cursor-pointer rounded-md bg-primary px-4 hover:bg-primary/90">
          Next
        </Button>
      </MobileActionBar>

      {/* the legacy "Note" modal: no further changes once the demo has been submitted */}
      <Dialog open={noteOpen} onOpenChange={(open) => !submitting && setNoteOpen(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Note</DialogTitle>
            <DialogDescription className="sr-only">Confirm that you want to submit your demo for review.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-[15px] font-bold text-black">
            <p>Dear {fullName || "Teacher"},</p>
            <p>
              Kindly review your details properly before clicking the submit button as there will be no further changes in your details
              once the demo has been submitted.
            </p>
            <p>
              Thanks
              <br />
              {context.schoolName}
            </p>
          </div>
          <DialogFooter className="sm:justify-end">
            <Button type="button" onClick={handleSubmit} disabled={submitting} className="cursor-pointer rounded-md bg-primary px-5 hover:bg-primary/90">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {submitting ? "Please wait…" : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TeacherDemoRecordingViewer context={context} attempt={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}
