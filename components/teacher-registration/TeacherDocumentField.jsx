"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, FileText, RefreshCw, Trash2, Upload } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Req } from "@/components/common/Req";
import { TEACHER_DOCUMENT_ACCEPT, validateTeacherDocumentFile } from "@/utils/teacherProfessionalDetails";
import { uploadTeacherDocument } from "@/utils/teacherDocumentUpload";

/**
 * One document of Step 2: pick a file and it uploads straight away (with a progress bar), then the saved file's name
 * is shown with View (opens the file in a new tab), Replace and Delete. A required document cannot be deleted away
 * from the form unnoticed: the parent keeps "Next" closed until every required one is there.
 *
 *   doc: an entry of TEACHER_DOCUMENTS     saved: { name, url } | undefined
 *   onUploaded(fileType, { name, url })    onDelete(fileType) -> Promise<boolean>  (true = removed)
 *   onBusyChange(fileType, busy)           onSessionOut()
 */
export function TeacherDocumentField({ school, doc, saved, error, onUploaded, onDelete, onBusyChange, onSessionOut }) {
  const inputRef = useRef(null);
  const abortRef = useRef(null);
  const [progress, setProgress] = useState(null); // null = not uploading, else 0-100
  const [removing, setRemoving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [localError, setLocalError] = useState("");
  const busy = progress !== null || removing;

  // Leaving the step cancels a running upload (the file would otherwise be stored without the page knowing).
  useEffect(() => () => abortRef.current?.abort(), []);

  function setBusy(next) {
    onBusyChange?.(doc.fileType, next);
  }

  async function handlePick(event) {
    const file = event.target.files?.[0];
    event.target.value = ""; // choosing the same file again must fire onChange again
    if (!file) return;
    setLocalError("");
    const problem = validateTeacherDocumentFile(file);
    if (problem) {
      setLocalError(problem);
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setProgress(0);
    setBusy(true);
    const answer = await uploadTeacherDocument({ school, file, fileType: doc.fileType, onProgress: setProgress, signal: controller.signal });
    abortRef.current = null;
    setProgress(null);
    setBusy(false);
    if (answer?.status === "1") {
      onUploaded(doc.fileType, { name: answer.originalName || file.name, url: answer.fileUrl || "" });
    } else if (answer?.status === "3") {
      onSessionOut?.();
    } else {
      setLocalError(answer?.message || "We couldn't upload the document. Please try again.");
    }
  }

  async function handleDelete() {
    setConfirmingDelete(false);
    setLocalError("");
    setRemoving(true);
    setBusy(true);
    let removed = false;
    try {
      removed = await onDelete(doc.fileType);
    } finally {
      setRemoving(false);
      setBusy(false);
    }
    if (!removed) setLocalError("We couldn't remove the document. Please try again.");
  }

  const shownError = localError || error;

  return (
    <div className={`rounded-lg border p-3 ${shownError ? "border-red-400" : "border-slate-200"}`}>
      <p className="text-sm font-semibold text-black">
        <Req label={doc.label} required={doc.required} />
      </p>

      <input ref={inputRef} type="file" accept={TEACHER_DOCUMENT_ACCEPT} onChange={handlePick} className="hidden" aria-label={`Upload ${doc.label}`} />

      {saved ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <FileText className="h-4 w-4 shrink-0 text-emerald-600" />
          <span className="min-w-0 flex-1 truncate text-sm text-black" title={saved.name}>
            {saved.name}
          </span>
          {progress === null && !removing && !confirmingDelete && (
            <div className="flex items-center gap-1">
              {saved.url && (
                <a
                  href={saved.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({ variant: "ghost", size: "sm" })}
                >
                  <Eye className="h-4 w-4" /> View
                </a>
              )}
              <Button type="button" variant="ghost" size="sm" className="cursor-pointer" onClick={() => inputRef.current?.click()}>
                <RefreshCw className="h-4 w-4" /> Replace
              </Button>
              <Button type="button" variant="ghost" size="sm" className="cursor-pointer text-red-600 hover:text-red-700" onClick={() => setConfirmingDelete(true)}>
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            </div>
          )}
          {confirmingDelete && (
            <div className="flex items-center gap-1 text-sm">
              <span className="text-slate-600">Remove this document?</span>
              <Button type="button" variant="destructive" size="sm" className="cursor-pointer" onClick={handleDelete}>
                Yes, remove
              </Button>
              <Button type="button" variant="outline" size="sm" className="cursor-pointer" onClick={() => setConfirmingDelete(false)}>
                No
              </Button>
            </div>
          )}
        </div>
      ) : (
        progress === null && (
          <Button type="button" variant="outline" size="sm" className="mt-2 cursor-pointer" onClick={() => inputRef.current?.click()}>
            <Upload className="h-4 w-4" /> Choose file
          </Button>
        )
      )}

      {progress !== null && (
        <div className="mt-2" role="status" aria-live="polite">
          <Progress value={progress} />
          <p className="mt-1 text-xs text-slate-500">{progress >= 100 ? "Saving…" : `Uploading… ${progress}%`}</p>
        </div>
      )}
      {removing && <p className="mt-2 text-xs text-slate-500">Removing…</p>}

      {shownError && <p className="mt-1.5 text-xs text-red-600">{shownError}</p>}
    </div>
  );
}
