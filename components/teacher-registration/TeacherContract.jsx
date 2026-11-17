"use client";

import { useMemo, useRef, useState } from "react";
import DOMPurify from "dompurify";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MobileActionBar } from "@/components/student-enroll/wizard/MobileActionBar";
import {
  CONTRACT_CONFIRM_TEXT,
  CONTRACT_DECLARATION_TEXT,
  DECLARATION_REQUIRED_MESSAGE,
  NO_SIGNATURE_AREA_MESSAGE,
  SIGNATURE_HINT,
  SIGNATURE_REQUIRED_MESSAGE,
  formatSignDate,
  hasSignatureArea,
  isSafeImageUrl,
  previewContractWithSignature,
  publishDateTimeText,
  validateSignatureFile,
} from "@/utils/teacherContract";

/**
 * Step 4 ("Contract"): the school's contract as the legacy wizard showed it (letterhead, recipient and publish date, the
 * contract, the signature upload, the school's address, "Acceptance of Offer"), and "Accept Contract", which asks
 * "Are you sure you want to proceed?" first. There is no Back (the legacy wizard hid it too).
 *
 * The contract text is the school's own HTML, so it is sanitised before it is shown. The signature the teacher chooses
 * is shown in its box so they see where it goes, but the signed contract is put together by the server from the
 * published one and the image: the page sends nothing but the image.
 *
 *   contract: utils/teacherContract.js mapContractDetails().contract   logoUrl: the school's logo (the letterhead of a
 *   school that has no letterhead of its own)   onAccept({ agreementLogId, signatureImage }): Promise<boolean>
 */
export function TeacherContract({ contract, logoUrl, onAccept }) {
  const inputRef = useRef(null);
  const [signature, setSignature] = useState(null); // { name, dataUri }
  const [declared, setDeclared] = useState(false);
  const [errors, setErrors] = useState({});
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const signable = useMemo(() => hasSignatureArea(contract.content), [contract.content]);
  // Today's date goes next to the signature, as in the legacy page (the server writes its own into the signed copy).
  const signDate = useMemo(() => formatSignDate(new Date()), []);
  const html = useMemo(
    () => DOMPurify.sanitize(previewContractWithSignature(contract.content, signature?.dataUri, signDate)),
    [contract.content, signature?.dataUri, signDate]
  );
  const letterhead = isSafeImageUrl(contract.letterHeadImage) ? contract.letterHeadImage : isSafeImageUrl(logoUrl) ? logoUrl : "";

  function handlePick(event) {
    const file = event.target.files?.[0];
    event.target.value = ""; // choosing the same file again must fire onChange again
    if (!file) return;
    const problem = validateSignatureFile(file);
    if (problem) {
      setSignature(null);
      setErrors((prev) => ({ ...prev, signature: problem }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setSignature({ name: file.name, dataUri: String(reader.result) });
      setErrors((prev) => ({ ...prev, signature: "" }));
    };
    reader.onerror = () => setErrors((prev) => ({ ...prev, signature: "We couldn't read this file. Please try another one." }));
    reader.readAsDataURL(file);
  }

  function handleAccept() {
    const next = {};
    if (!signature) next.signature = SIGNATURE_REQUIRED_MESSAGE;
    if (!declared) next.declaration = DECLARATION_REQUIRED_MESSAGE;
    setErrors(next);
    if (Object.keys(next).length === 0) setConfirming(true);
  }

  async function handleConfirmed() {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onAccept({ agreementLogId: contract.agreementLogId, signatureImage: signature.dataUri });
    } finally {
      setSubmitting(false);
      setConfirming(false);
    }
  }

  return (
    <div className="mx-auto mt-4 max-w-7xl rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-4 lg:px-8 lg:py-6">
      <h2 className="text-center text-xl font-extrabold text-black md:text-2xl">Contract Details</h2>

      {letterhead && (
        <div className="mt-4">
          {/* The school's own letterhead or logo: an arbitrary address from the school's settings (not one this app can
              list in its image domains), so a plain <img>. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={letterhead} alt="" width={300} className="h-auto w-[300px] max-w-full" />
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3 text-sm font-semibold text-black">
        <div>
          <p>{contract.recipientName},</p>
          {contract.locationLine && <p>{contract.locationLine}</p>}
        </div>
        <div className="text-right">
          {contract.publishDate && <p>Date: {contract.publishDate}</p>}
          {contract.publishTime && <p>Time: {contract.publishTime}</p>}
        </div>
      </div>

      <div className="mt-4 overflow-x-auto text-sm leading-relaxed text-black" dangerouslySetInnerHTML={{ __html: html }} />

      <div className="mt-5 rounded-xl border border-slate-200 p-3">
        <p className="text-sm font-bold text-black">Upload Recipient Signature</p>
        <input ref={inputRef} type="file" accept="image/png,image/jpeg" onChange={handlePick} className="hidden" aria-label="Upload Recipient Signature" />
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} className="cursor-pointer">
            {signature ? signature.name : "Choose file..."}
          </Button>
          {signature && (
            // A data URL of the file just chosen (Base64), which next/image cannot optimise or needs a loader for.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={signature.dataUri} alt="Your signature" className="h-12 w-auto max-w-[160px] rounded border border-slate-200 bg-white object-contain p-1" />
          )}
        </div>
        <p className="mt-2 text-xs text-red-600">{SIGNATURE_HINT}</p>
        {errors.signature && <p className="mt-1 text-xs font-semibold text-red-600">{errors.signature}</p>}
        {!signable && <p className="mt-1 text-xs font-semibold text-red-600">{NO_SIGNATURE_AREA_MESSAGE}</p>}
      </div>

      <div className="mt-4 text-sm text-black">
        {contract.schoolAddress && (
          <p>
            <span className="font-bold">Address:</span> {contract.schoolAddress}
          </p>
        )}
        {publishDateTimeText(contract) && (
          <p>
            <span className="font-bold">Date:</span> {publishDateTimeText(contract)}
          </p>
        )}
      </div>

      <div className="mt-5">
        <h3 className="text-base font-bold text-black">Acceptance of Offer</h3>
        <label className="mt-2 flex cursor-pointer items-start gap-3 text-[13px] leading-snug text-black">
          <Checkbox
            checked={declared}
            onCheckedChange={(checked) => {
              setDeclared(Boolean(checked));
              if (checked) setErrors((prev) => ({ ...prev, declaration: "" }));
            }}
            className="mt-0.5"
            aria-invalid={Boolean(errors.declaration)}
          />
          <span>{CONTRACT_DECLARATION_TEXT}</span>
        </label>
        {errors.declaration && <p className="mt-1 pl-7 text-xs font-semibold text-red-600">{errors.declaration}</p>}
      </div>

      <MobileActionBar context={null} className="md:mt-6">
        <Button
          type="button"
          onClick={handleAccept}
          disabled={submitting || !signable}
          className="cursor-pointer rounded-md bg-primary px-4 hover:bg-primary/90"
        >
          Accept Contract
        </Button>
      </MobileActionBar>

      <Dialog open={confirming} onOpenChange={(open) => !submitting && setConfirming(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Are you sure you want to proceed?</DialogTitle>
            <DialogDescription>{CONTRACT_CONFIRM_TEXT}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setConfirming(false)} disabled={submitting} className="cursor-pointer">
              No
            </Button>
            <Button type="button" onClick={handleConfirmed} disabled={submitting} className="cursor-pointer rounded-md bg-primary px-5 hover:bg-primary/90">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {submitting ? "Please wait…" : "Yes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
