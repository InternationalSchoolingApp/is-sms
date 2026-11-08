"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Eye, FileText, Trash2, Upload, X } from "lucide-react";
import toast from "react-hot-toast";
import { ConfirmDialog } from "@/components/k5/pages/K5ProfileEditors";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/*
 * My Profile > Academic Information > Documents, the way the existing page works (profileViewNewContent.js
 * ageProofElement … lastAcademicProofElement, cropperImage.js, profileViewNew.js saveDocs / removeUploadImage /
 * viewAttachmentProfile):
 *   - Upload: JPG / PNG opens "Crop the image" (Cancel / Crop / Rotate, free crop box); a PDF is taken as it is.
 *     Max 5 MB, otherwise the existing messages.
 *   - The chosen files wait on the page (file name + View + Delete) until "Save Documents" sends them all in one
 *     save-docs call (app/api/profile/document); nothing chosen -> "No attachment file is selected".
 *   - A saved document shows its file name with View (preview dialog) and Delete (asks first, delete-uploaded-docs).
 */

// Backend docType for each document of the profile (the parent passport is stored as "Signature").
const DOC_TYPE = { ageProof: "Age Proof", addressProof: "Address Proof", parentPassportProof: "Signature", lastAcademicProof: "Last Academic Proof" };
const MAX_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png"];

const OVERLAY = "fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(10,16,34,0.45)] p-4";
const DIALOG = "flex max-h-[calc(100dvh-32px)] w-full flex-col overflow-hidden rounded-[18px] border-[3px] border-k5-line bg-k5-card shadow-[0_18px_48px_rgba(10,16,34,0.28)]";
const HEAD = "flex items-center justify-between gap-3 bg-k5-ac px-4 py-3 text-white";
const CLOSE_BTN = "flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-[10px] border-none bg-white/15 text-white hover:bg-white/25";
const FOOT_BTN = "inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-[10px] border-none px-4 font-k5-body text-sm font-black disabled:cursor-not-allowed disabled:opacity-50";
const ICON_BTN = "inline-flex h-[50px] w-[50px] flex-none cursor-pointer items-center justify-center rounded-[10px] border-none text-white disabled:cursor-not-allowed disabled:opacity-50";

const isPdf = (doc) => doc.type === "P" || /\.pdf($|\?)/i.test(doc.url || doc.name || "");
const nameWithExt = (name, ext) => `${String(name || "document").replace(/\.[^.]+$/, "")}.${ext}`;

function useEscape(open, onClose) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
}

/* ─────────────────────────── Crop the image ─────────────────────────── */

const MIN = 24;
const HANDLES = [
  ["nw", "left-0 top-0 cursor-nwse-resize"],
  ["n", "left-1/2 top-0 cursor-ns-resize"],
  ["ne", "left-full top-0 cursor-nesw-resize"],
  ["e", "left-full top-1/2 cursor-ew-resize"],
  ["se", "left-full top-full cursor-nwse-resize"],
  ["s", "left-1/2 top-full cursor-ns-resize"],
  ["sw", "left-0 top-full cursor-nesw-resize"],
  ["w", "left-0 top-1/2 cursor-ew-resize"],
];

/** Fits the picture in the dialog and starts with a box over 80% of it (cropper.js autoCropArea). */
function layout(el) {
  const maxW = Math.max(200, Math.min(720, window.innerWidth - 72));
  const maxH = Math.max(200, Math.min(560, window.innerHeight * 0.6));
  const scale = Math.min(maxW / el.naturalWidth, maxH / el.naturalHeight, 1);
  const W = Math.round(el.naturalWidth * scale);
  const H = Math.round(el.naturalHeight * scale);
  return { W, H, rect: { x: Math.round(W * 0.1), y: Math.round(H * 0.1), w: Math.round(W * 0.8), h: Math.round(H * 0.8) } };
}

/**
 * The existing page's crop dialog (cropper.js, free aspect ratio): drag the box to move it, drag a handle to resize,
 * arrow keys move it, Rotate turns the picture 90° each time, Crop hands the cropped part to onCrop(file).
 */
export function DocCropDialog({ file, onCancel, onCrop }) {
  // { el: loaded <img>, url, W, H } for the picture as it is now (after any rotation).
  const [pic, setPic] = useState(null);
  const [rect, setRect] = useState(null);
  const drag = useRef(null);
  const cropRef = useRef(null);
  useEscape(Boolean(file), onCancel);

  const show = (url) => {
    const el = new Image();
    el.onload = () => {
      const { W, H, rect: start } = layout(el);
      setPic({ el, url, W, H });
      setRect(start);
    };
    el.src = url;
  };

  useEffect(() => {
    if (!file) return undefined;
    const url = URL.createObjectURL(file);
    show(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (pic) cropRef.current?.focus();
  }, [pic]);

  if (!file) return null;

  const outType = file.type === "image/png" ? "image/png" : "image/jpeg";

  const rotate = () => {
    if (!pic) return;
    const canvas = document.createElement("canvas");
    canvas.width = pic.el.naturalHeight;
    canvas.height = pic.el.naturalWidth;
    const ctx = canvas.getContext("2d");
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(pic.el, -pic.el.naturalWidth / 2, -pic.el.naturalHeight / 2);
    show(canvas.toDataURL(outType, 0.95));
  };

  const crop = () => {
    if (!pic || !rect) return;
    const k = pic.el.naturalWidth / pic.W;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(rect.w * k));
    canvas.height = Math.max(1, Math.round(rect.h * k));
    const ctx = canvas.getContext("2d");
    if (outType === "image/jpeg") {
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(pic.el, rect.x * k, rect.y * k, rect.w * k, rect.h * k, 0, 0, canvas.width, canvas.height);
    const finish = (blob, type) => {
      const ext = type === "image/png" ? "png" : "jpg";
      onCrop(new File([blob], nameWithExt(file.name, ext), { type }));
    };
    canvas.toBlob((blob) => {
      if (!blob) return toast.error("The picture could not be cropped.");
      // A big PNG can pass 5 MB once cropped; a JPEG of the same part keeps it under the limit.
      if (blob.size > MAX_BYTES) {
        canvas.toBlob((jpeg) => (jpeg ? finish(jpeg, "image/jpeg") : toast.error("The picture could not be cropped.")), "image/jpeg", 0.85);
      } else finish(blob, outType);
    }, outType, 0.92);
  };

  // The box (data-mode="move") and each handle (data-mode="nw" …) start a drag; the mode comes from the element.
  const start = (e) => {
    const mode = e.currentTarget.dataset.mode;
    if (!rect || !mode) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drag.current = { mode, x: e.clientX, y: e.clientY, r: rect };
  };
  const move = (e) => {
    const d = drag.current;
    if (!d || !pic) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    const { r } = d;
    if (d.mode === "move") {
      setRect({ ...r, x: Math.min(pic.W - r.w, Math.max(0, r.x + dx)), y: Math.min(pic.H - r.h, Math.max(0, r.y + dy)) });
      return;
    }
    let { x, y, w, h } = r;
    if (d.mode.includes("w")) {
      x = Math.min(r.x + r.w - MIN, Math.max(0, r.x + dx));
      w = r.x + r.w - x;
    }
    if (d.mode.includes("e")) w = Math.min(pic.W - r.x, Math.max(MIN, r.w + dx));
    if (d.mode.includes("n")) {
      y = Math.min(r.y + r.h - MIN, Math.max(0, r.y + dy));
      h = r.y + r.h - y;
    }
    if (d.mode.includes("s")) h = Math.min(pic.H - r.y, Math.max(MIN, r.h + dy));
    setRect({ x, y, w, h });
  };
  const end = () => {
    drag.current = null;
  };
  const nudge = (e) => {
    const step = e.shiftKey ? 1 : 10;
    const by = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!by || !pic || !rect) return;
    e.preventDefault();
    setRect({ ...rect, x: Math.min(pic.W - rect.w, Math.max(0, rect.x + by[0])), y: Math.min(pic.H - rect.h, Math.max(0, rect.y + by[1])) });
  };

  return (
    <div className={OVERLAY}>
      <div role="dialog" aria-modal="true" aria-labelledby="k5-doc-crop-h" className={`${DIALOG} max-w-[780px]`}>
        <div className={HEAD}>
          <h2 id="k5-doc-crop-h" className="m-0 font-k5-display text-lg font-semibold">
            Crop the image
          </h2>
          <button type="button" onClick={onCancel} aria-label="Close" className={CLOSE_BTN}>
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="flex min-h-[220px] flex-1 items-center justify-center overflow-auto bg-k5-soft p-4">
          {pic && rect ? (
            <div className="relative touch-none select-none overflow-hidden" style={{ width: pic.W, height: pic.H }} onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
              {/* eslint-disable-next-line @next/next/no-img-element -- a local object / data URL being cropped */}
              <img src={pic.url} alt="" draggable={false} className="block h-full w-full" />
              <div
                ref={cropRef}
                tabIndex={0}
                role="group"
                aria-roledescription="crop area"
                aria-label="Crop area. Drag to move, use the arrow keys, or drag a corner to resize."
                data-mode="move"
                onPointerDown={start}
                onKeyDown={nudge}
                className="absolute cursor-move outline-none ring-k5-acl focus-visible:ring-4"
                style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h, boxShadow: "0 0 0 9999px rgba(10,16,34,0.5)", border: "1px solid #39f" }}
              >
                <span aria-hidden="true" className="pointer-events-none absolute inset-0 border-x border-dashed border-white/70" style={{ left: "33.33%", right: "33.33%" }} />
                <span aria-hidden="true" className="pointer-events-none absolute inset-0 border-y border-dashed border-white/70" style={{ top: "33.33%", bottom: "33.33%" }} />
                {HANDLES.map(([mode, place]) => (
                  <span
                    key={mode}
                    aria-hidden="true"
                    data-mode={mode}
                    onPointerDown={start}
                    className={`absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-[2px] bg-[#39f] ${place}`}
                  />
                ))}
              </div>
            </div>
          ) : (
            <span className="text-sm font-black text-k5-mut" role="status">
              Loading the picture…
            </span>
          )}
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t-[3px] border-k5-line px-4 py-3">
          <button type="button" onClick={onCancel} className={`${FOOT_BTN} bg-k5-ink text-white`}>
            Cancel
          </button>
          <button type="button" onClick={crop} disabled={!pic} className={`${FOOT_BTN} bg-k5-ac text-white`}>
            Crop
          </button>
          <button type="button" onClick={rotate} disabled={!pic} className={`${FOOT_BTN} bg-k5-ac text-white`}>
            Rotate
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Preview File ─────────────────────────── */

/** The existing page's "Preview File" dialog: the picture, or the PDF with a Download PDF link. */
export function DocPreviewDialog({ doc, onClose }) {
  useEscape(Boolean(doc), onClose);
  if (!doc) return null;
  return (
    <div className={OVERLAY} onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="k5-doc-view-h" onClick={(e) => e.stopPropagation()} className={`${DIALOG} max-w-[720px]`}>
        <div className={HEAD}>
          <h2 id="k5-doc-view-h" className="m-0 min-w-0 truncate font-k5-display text-lg font-semibold">
            Preview File{doc.name ? ` · ${doc.name}` : ""}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className={CLOSE_BTN}>
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto p-3">
          {doc.pdf ? (
            <>
              <a
                href={doc.url}
                download={doc.name || "document.pdf"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-9 items-center gap-2 self-end rounded-[10px] bg-k5-ac px-3 text-sm font-black text-white no-underline"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                Download PDF
              </a>
              <iframe src={doc.url} title={doc.name || "PDF document"} className="h-[65dvh] w-full rounded-[10px] border-[3px] border-k5-line bg-white" />
            </>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- an uploaded proof (S3) or a local object URL of any size
            <img src={doc.url} alt={doc.label || "Document"} className="mx-auto block max-h-[70dvh] max-w-full rounded-[10px] object-contain" />
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Documents ─────────────────────────── */

function DocSlot({ doc, waiting, busy, onChoose, onView, onRemove }) {
  const inputId = `k5-doc-${doc.key}`;
  const shown = waiting || (doc.url ? { name: doc.name || doc.label } : null);
  return (
    <div className="relative flex min-w-0 flex-col gap-1.5">
      <span className="text-sm font-black text-k5-acx">{doc.label}:</span>
      {shown ? (
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-[50px] min-w-0 flex-1 items-center gap-2 rounded-[14px] border-[3px] border-dashed border-k5-ac bg-k5-card px-2.5 py-1.5">
            <span aria-hidden="true" className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-k5-act text-k5-acx">
              <FileText className="h-4 w-4" />
            </span>
            <Tooltip>
              <TooltipTrigger delay={100} render={<span className="min-w-0 flex-1 truncate text-sm font-extrabold text-k5-ink" title={shown.name} />}>
                {shown.name}
              </TooltipTrigger>
              <TooltipContent>{shown.name}</TooltipContent>
            </Tooltip>
            {waiting && <span className="flex-none rounded-full bg-k5-yt px-2 py-0.5 text-[11px] font-black text-k5-yx">Not saved</span>}
          </div>
          <button type="button" onClick={onView} aria-label={`View ${doc.label}`} title="View" className={`${ICON_BTN} bg-[#13803F]`}>
            <Eye className="h-5 w-5" aria-hidden="true" />
          </button>
          <button type="button" onClick={onRemove} disabled={busy} aria-label={`Delete ${doc.label}`} title="Delete" className={`${ICON_BTN} bg-[#DC2F45]`}>
            <Trash2 className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <>
          <input
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,application/pdf"
            className="sr-only"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) onChoose(file);
            }}
          />
          <label
            htmlFor={inputId}
            className="flex h-[50px] cursor-pointer items-center justify-center gap-2 rounded-[14px] border-[3px] border-dashed border-k5-ac bg-k5-card px-3 text-sm font-black text-k5-acx hover:bg-k5-act"
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            Upload
          </label>
        </>
      )}
    </div>
  );
}

/** Section 3: Age Proof, Address Proof, Parent Passport, Last Academic Proof + Save Documents. */
export function EditableDocuments({ m, actions }) {
  // docType -> { file, name, url (object URL), pdf } chosen but not saved yet.
  const [waiting, setWaiting] = useState({});
  const [cropFor, setCropFor] = useState(null); // { docType, file }
  const [preview, setPreview] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const urls = useRef(new Set());

  useEffect(() => {
    const live = urls.current;
    return () => live.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const keep = (docType, file) => {
    const url = URL.createObjectURL(file);
    urls.current.add(url);
    setWaiting((w) => ({ ...w, [docType]: { file, name: file.name, url, pdf: file.type === "application/pdf" } }));
  };
  const drop = (docType) =>
    setWaiting((w) => {
      const { [docType]: gone, ...rest } = w;
      if (gone) {
        URL.revokeObjectURL(gone.url);
        urls.current.delete(gone.url);
      }
      return rest;
    });

  const choose = (docType, file) => {
    if (file.size > MAX_BYTES) return toast.error("Please upload files in PDF, JPG, PNG, and JPEG with max size of 5MB");
    if (file.type === "application/pdf") return keep(docType, file);
    if (IMAGE_TYPES.includes(file.type)) return setCropFor({ docType, file });
    return toast.error("Please upload files in PDF, JPG, PNG, and JPEG Format");
  };

  const remove = (docType) => {
    if (waiting[docType]) return drop(docType);
    setConfirm({
      message: "Are you sure you want to remove this document?",
      okLabel: "Yes, remove",
      cancel: () => setConfirm(null),
      accept: () => {
        setConfirm(null);
        actions.removeDocument(docType);
      },
    });
  };

  const count = Object.keys(waiting).length;
  const saving = actions.busy === "doc:save";
  const save = async () => {
    if (!count) return toast.error("No attachment file is selected");
    const ok = await actions.uploadDocuments(Object.entries(waiting).map(([docType, w]) => ({ docType, file: w.file })));
    if (ok) Object.keys(waiting).forEach(drop);
  };

  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-x-4 gap-y-3">
        {m.academic.documents.map((doc) => {
          const docType = DOC_TYPE[doc.key];
          const w = waiting[docType];
          return (
            <DocSlot
              key={doc.key}
              doc={doc}
              waiting={w}
              busy={Boolean(actions.busy)}
              onChoose={(file) => choose(docType, file)}
              onView={() => setPreview(w ? { url: w.url, name: w.name, pdf: w.pdf, label: doc.label } : { url: doc.url, name: doc.name, pdf: isPdf(doc), label: doc.label })}
              onRemove={() => remove(docType)}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <p className="m-0 text-[13px] font-extrabold text-k5-mut">JPG, PNG or PDF, up to 5 MB. Pictures can be cropped before saving.</p>
        <button
          type="button"
          onClick={save}
          disabled={!count || Boolean(actions.busy)}
          className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-[10px] border-none bg-[#13803F] px-4 font-k5-body text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving…" : count ? `Save Documents (${count})` : "Save Documents"}
        </button>
      </div>
      <DocCropDialog
        key={cropFor ? `${cropFor.docType}-${cropFor.file.name}-${cropFor.file.lastModified}` : "none"}
        file={cropFor?.file ?? null}
        onCancel={() => setCropFor(null)}
        onCrop={(file) => {
          keep(cropFor.docType, file);
          setCropFor(null);
        }}
      />
      <DocPreviewDialog doc={preview} onClose={() => setPreview(null)} />
      <ConfirmDialog confirm={confirm} />
    </>
  );
}
