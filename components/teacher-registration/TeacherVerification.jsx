"use client";

import { useState } from "react";
import { BriefcaseBusiness, Link2, Loader2, Mail, User } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { MobileActionBar } from "@/components/student-enroll/wizard/MobileActionBar";
import { PhoneNumberField } from "@/components/student-enroll/PhoneNumberField";
import { Req } from "@/components/common/Req";
import { TeacherDocumentField } from "@/components/teacher-registration/TeacherDocumentField";
import { useTeacherDocumentDelete } from "@/hooks/useTeacherProfessionalDetails";
import { TEACHER_DOCUMENT_MAX_LABEL } from "@/utils/teacherProfessionalDetails";
import {
  MAX_REFERENCE_TEXT_LENGTH,
  NO_SOCIAL_MEDIA_TEXT,
  POLICE_CHECKBOX_TEXT,
  SOCIAL_FIELDS,
  SOCIAL_MEDIA_NOTE,
  TEACHER_VERIFICATION_DOCUMENTS,
  firstVerificationError,
  getPoliceDeclarationLines,
  sanitizeReferenceName,
  validateVerification,
} from "@/utils/teacherVerification";

const STATUS_SUCCESS = "1";
const docOf = (fileType) => TEACHER_VERIFICATION_DOCUMENTS.find((doc) => doc.fileType === fileType);

function SectionTitle({ children }) {
  return <h3 className="mt-6 text-sm font-extrabold tracking-wide text-black uppercase">{children}</h3>;
}

/**
 * Step 5 ("Verification"): social media, the two recommendation letters, two references, the police declaration with its
 * document, and the last salary slip, as the legacy wizard listed them. The documents are stored the moment they are
 * chosen (the same way as Step 2); everything else is sent with Next, which asks "Note" first and then submits.
 * There is no Back (the legacy wizard hid it too: the contract cannot be revisited).
 *
 *   initial: { fields, documents } (utils/teacherVerification.js mapVerificationDetails), read at mount only
 *   fullName: the teacher's name for the police declaration   teacherEmail: the teacher's own address (not a reference)
 *   onSubmit(fields): Promise<boolean> (true = sent; the screen then changes by itself)   onSessionOut()
 */
export function TeacherVerification({ context, school, initial, fullName, teacherEmail, onSubmit, onSessionOut }) {
  const [fields, setFields] = useState(initial.fields);
  const [documents, setDocuments] = useState(initial.documents);
  const [busyTypes, setBusyTypes] = useState(() => new Set());
  const [attempted, setAttempted] = useState(false); // after the first Next, every check shows (and updates) live
  const [noteOpen, setNoteOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const removeDocument = useTeacherDocumentDelete({ context });

  const uploading = busyTypes.size > 0;
  const errors = attempted ? validateVerification(fields, documents, { teacherEmail }).errors : null;

  function setLink(key, value) {
    setFields((prev) => ({ ...prev, links: { ...prev.links, [key]: value } }));
  }

  // Ticking "I do not have any active social media accounts" clears the four links for good (the legacy page's rule).
  function setNoSocialMedia(checked) {
    setFields((prev) => ({
      ...prev,
      noSocialMedia: checked,
      links: checked ? { linkedIn: "", facebook: "", instagram: "", twitter: "" } : prev.links,
    }));
  }

  function setReference(index, patch) {
    setFields((prev) => ({
      ...prev,
      references: prev.references.map((reference, i) => (i === index ? { ...reference, ...patch } : reference)),
    }));
  }

  function handleBusyChange(fileType, busy) {
    setBusyTypes((prev) => {
      const next = new Set(prev);
      if (busy) next.add(fileType);
      else next.delete(fileType);
      return next;
    });
  }

  async function handleDeleteDocument(fileType) {
    try {
      const answer = await removeDocument.mutateAsync(fileType);
      if (answer?.status !== STATUS_SUCCESS) return false;
      setDocuments((prev) => {
        const next = { ...prev };
        delete next[fileType];
        return next;
      });
      return true;
    } catch {
      return false;
    }
  }

  function handleNext() {
    setAttempted(true);
    const { valid, errors: found } = validateVerification(fields, documents, { teacherEmail });
    if (!valid) {
      toast.error(firstVerificationError(found));
      return;
    }
    setNoteOpen(true);
  }

  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(fields);
    } finally {
      setSubmitting(false);
    }
  }

  function documentField(fileType) {
    const doc = docOf(fileType);
    return (
      <TeacherDocumentField
        key={fileType}
        school={school}
        doc={doc}
        saved={documents[fileType]}
        error={errors?.documents[fileType] || ""}
        onUploaded={(type, saved) => setDocuments((prev) => ({ ...prev, [type]: saved }))}
        onDelete={handleDeleteDocument}
        onBusyChange={handleBusyChange}
        onSessionOut={onSessionOut}
      />
    );
  }

  return (
    <div className="mx-auto mt-4 max-w-7xl rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-4 lg:px-8 lg:py-6">
      <h2 className="text-center text-xl font-extrabold text-black md:text-2xl">Verification</h2>

      <SectionTitle>Complete Social Media Details (Background Check)</SectionTitle>
      <p className="mt-1 text-xs font-semibold text-red-600">{SOCIAL_MEDIA_NOTE}</p>
      <div className="mt-3 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        {SOCIAL_FIELDS.map((field) => (
          <FloatingLabelInput
            key={field.key}
            icon={Link2}
            label={field.label}
            value={fields.links[field.key]}
            maxLength={255}
            disabled={fields.noSocialMedia}
            onChange={(event) => setLink(field.key, event.target.value)}
          />
        ))}
      </div>
      <label className="mt-3 flex cursor-pointer items-start gap-3 text-[13px] leading-snug text-black">
        <Checkbox checked={fields.noSocialMedia} onCheckedChange={(checked) => setNoSocialMedia(Boolean(checked))} className="mt-0.5" />
        <span>{NO_SOCIAL_MEDIA_TEXT}</span>
      </label>
      {errors?.social && <p className="mt-1 text-xs font-semibold text-red-600">{errors.social}</p>}

      <SectionTitle>Recommendation Letter or Any Reference</SectionTitle>
      <p className="mt-1 text-xs font-semibold text-red-600">
        NOTE:- Please upload files in following formats (jpg, jpeg, pdf or png) with maximum size of {TEACHER_DOCUMENT_MAX_LABEL}
      </p>
      <div className="mt-3 grid grid-cols-1 gap-3.5 sm:grid-cols-2">{[73, 74].map(documentField)}</div>

      {fields.references.map((reference, index) => {
        const found = errors?.references[index] || {};
        return (
          <div key={index} className="mt-5 rounded-xl border border-slate-200 p-3">
            <p className="text-sm font-bold text-black">
              <Req label={`Reference ${index + 1}`} required />
            </p>
            {found.general && <p className="mt-1 text-xs font-semibold text-red-600">{found.general}</p>}
            <div className="mt-3 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <FloatingLabelInput
                icon={User}
                label="Name"
                value={reference.name}
                maxLength={MAX_REFERENCE_TEXT_LENGTH}
                onChange={(event) => setReference(index, { name: sanitizeReferenceName(event.target.value) })}
                error={found.name}
              />
              <FloatingLabelInput
                icon={Mail}
                label="Email"
                type="email"
                value={reference.email}
                maxLength={MAX_REFERENCE_TEXT_LENGTH}
                onChange={(event) => setReference(index, { email: event.target.value })}
                error={found.email}
              />
              <PhoneNumberField
                label="Phone Number"
                name={`referencePhone${index + 1}`}
                value={reference.phone}
                className="w-full pb-1.5"
                // Only takes effect at mount (see useIntlTelInput): restores the saved country flag.
                initialCountry={reference.isoCode || undefined}
                onChange={({ contactNumber, countryIsdCode, countryCode, isValid }) =>
                  setReference(index, { phone: contactNumber, isdCode: countryIsdCode, isoCode: countryCode.toLowerCase(), phoneValid: isValid })
                }
                error={found.phone}
              />
              <FloatingLabelInput
                icon={BriefcaseBusiness}
                label="Designation"
                value={reference.designation}
                maxLength={MAX_REFERENCE_TEXT_LENGTH}
                onChange={(event) => setReference(index, { designation: event.target.value })}
                error={found.designation}
              />
            </div>
          </div>
        );
      })}

      <SectionTitle>Police Verification</SectionTitle>
      <div className="mt-2 space-y-1.5 text-[13px] leading-snug text-black">
        {getPoliceDeclarationLines(fullName).map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      <label className="mt-3 flex cursor-pointer items-start gap-3 text-[13px] leading-snug text-black">
        <Checkbox
          checked={fields.policeAccepted}
          onCheckedChange={(checked) => setFields((prev) => ({ ...prev, policeAccepted: Boolean(checked) }))}
          className="mt-0.5"
          aria-invalid={Boolean(errors?.police)}
        />
        <span>{POLICE_CHECKBOX_TEXT}</span>
      </label>
      {errors?.police && <p className="mt-1 pl-7 text-xs font-semibold text-red-600">{errors.police}</p>}

      <SectionTitle>Upload Documents</SectionTitle>
      <p className="mt-1 text-xs font-semibold text-red-600">
        NOTE:- Please upload files in following formats (jpg, jpeg, pdf or png) with maximum size of {TEACHER_DOCUMENT_MAX_LABEL}
      </p>
      <div className="mt-3 grid grid-cols-1 gap-3.5 sm:grid-cols-2">{[72, 41].map(documentField)}</div>

      <MobileActionBar context={null} className="md:mt-6">
        <Button
          type="button"
          onClick={handleNext}
          disabled={uploading || submitting}
          className="cursor-pointer rounded-md bg-primary px-4 hover:bg-primary/90"
        >
          {uploading ? "Uploading…" : "Next"}
        </Button>
      </MobileActionBar>

      {/* the legacy "Note" modal: no changes once the documents are submitted */}
      <Dialog open={noteOpen} onOpenChange={(open) => !submitting && setNoteOpen(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Note</DialogTitle>
            <DialogDescription className="sr-only">Confirm that you want to submit your verification documents.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-[15px] font-bold text-black">
            <p>Dear {fullName || "Teacher"},</p>
            <p>
              Please review your documents carefully before submitting, as no changes can be made once your verification documents have
              been submitted.
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
    </div>
  );
}
