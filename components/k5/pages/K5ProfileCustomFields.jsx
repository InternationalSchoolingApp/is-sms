"use client";

import { useState } from "react";
import { CalendarDays, Check, Eye, FileText, Trash2, Upload } from "lucide-react";
import toast from "react-hot-toast";
import { DatePicker } from "@/components/ui/date-picker";
import { ConfirmDialog, EditSelect, EditText, UnitBar } from "@/components/k5/pages/K5ProfileEditors";
import { DocCropDialog, DocPreviewDialog } from "@/components/k5/pages/K5ProfileDocs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatProfileDate, parseProfileDate } from "@/utils/profileEdit";
import { customDisplayValue, customOptionKey } from "@/utils/profileModel";

/*
 * School-defined custom profile fields of a section (profileViewNewContent.js renderDynamicFieldByUserID): text, date,
 * dropdown, checkbox, radio and file, each with its optional purpose line. Values save like any other field (tick /
 * Save / Bulk Save; keyId customProfileFieldId, utils/profileEdit.js). A file uploads at once (JPG / PNG are cropped
 * first, like the existing page) and has View / Delete. Without editing rights the values are shown read-only.
 */

const GRID3 = "grid grid-cols-3 gap-x-4 gap-y-3.5 max-[1180px]:grid-cols-2 max-[600px]:grid-cols-1";
const HR = <hr className="my-1 h-[3px] rounded-[3px] border-none bg-k5-line" />;
const LABEL = "relative flex min-w-0 flex-col gap-1.5 pt-1.5 text-sm font-black text-k5-mut [&>span:first-child]:pointer-events-none [&>span:first-child]:absolute [&>span:first-child]:start-3 [&>span:first-child]:top-0 [&>span:first-child]:z-[1] [&>span:first-child]:-translate-y-1/2 [&>span:first-child]:bg-k5-card [&>span:first-child]:px-1 [&>span:first-child]:text-xs [&>span:first-child]:leading-none";
const RO = "flex h-[50px] items-center gap-2 rounded-[14px] border-[3px] border-k5-line bg-k5-soft px-3.5 py-2 font-k5-body text-base font-extrabold text-k5-ink [overflow-wrap:anywhere]";
const ICON_BTN = "inline-flex h-[50px] w-[50px] flex-none cursor-pointer items-center justify-center rounded-[10px] border-none text-white disabled:cursor-not-allowed disabled:opacity-50";
const MAX_BYTES = 5 * 1024 * 1024;

function Purpose({ text }) {
  return text ? <span className="text-[13px] font-extrabold italic text-k5-mut">{text}</span> : null;
}

function Choice({ on, onClick, radio, children }) {
  return (
    <button
      type="button"
      role={radio ? "radio" : "checkbox"}
      aria-checked={Boolean(on)}
      onClick={onClick}
      className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-full border-[3px] py-1 pe-4 ps-3 font-k5-body text-[15px] font-black text-k5-ink ${on ? "border-k5-ac bg-k5-act" : "border-k5-line bg-k5-card"}`}
    >
      <span aria-hidden="true" className={`flex h-5 w-5 flex-none items-center justify-center border-2 ${radio ? "rounded-full" : "rounded-md"} ${on ? "border-k5-ac bg-k5-ac text-white" : "border-k5-line bg-k5-card"}`}>
        {on && (radio ? <span className="h-2 w-2 rounded-full bg-white" /> : <Check className="h-3.5 w-3.5" strokeWidth={3.6} />)}
      </span>
      {children}
    </button>
  );
}

/** Checkbox (several, saved as "A,B" in option order) or radio (one). */
function ChoiceField({ field, editor }) {
  const key = `custom.${field.id}`;
  const radio = field.type === "radio";
  const chosen = String(editor.draft[key] || "").split(",").map((x) => x.trim()).filter(Boolean);
  const toggle = (option) => {
    if (radio) return editor.set(key, option);
    const next = chosen.includes(option) ? chosen.filter((x) => x !== option) : [...chosen, option];
    editor.set(key, field.options.filter((o) => next.includes(o)).join(","));
  };
  return (
    <div className="col-span-full flex flex-col gap-2">
      <span className="text-sm font-black text-k5-mut">{field.label}</span>
      <div role={radio ? "radiogroup" : "group"} aria-label={field.label} className="flex flex-wrap gap-2.5">
        {field.options.map((option) => (
          <Choice key={option} radio={radio} on={chosen.includes(option)} onClick={() => toggle(option)}>
            {option}
          </Choice>
        ))}
      </div>
      <UnitBar editor={editor} unit={editor.unitOf(key)} />
      <Purpose text={field.purpose} />
    </div>
  );
}

function DateField({ field, editor }) {
  const key = `custom.${field.id}`;
  return (
    <div className={LABEL}>
      <DatePicker label={field.label} icon={CalendarDays} height="h-[50px]" value={parseProfileDate(editor.draft[key])} fromDate={new Date(1930, 0, 1)} onChange={(date) => editor.set(key, formatProfileDate(date))} />
      <UnitBar editor={editor} unit={editor.unitOf(key)} />
      <Purpose text={field.purpose} />
    </div>
  );
}

/** A file field: saved file name + View + Delete, or Upload (pictures are cropped first). */
function FileField({ field, actions, onView, onCrop, onAskRemove }) {
  const busy = actions?.busy === `custom:${field.id}`;
  const inputId = `k5-custom-file-${field.id}`;
  const choose = (file) => {
    if (file.size > MAX_BYTES) return toast.error("Please upload files in PDF, JPG, PNG, and JPEG with max size of 5MB");
    if (file.type === "application/pdf") return actions.uploadCustomFile(field.id, file);
    if (["image/jpeg", "image/jpg", "image/png"].includes(file.type)) return onCrop(field, file);
    return toast.error("Please upload files in PDF, JPG, PNG, and JPEG Format");
  };
  return (
    <div className="relative flex min-w-0 flex-col gap-1.5">
      <span className="text-sm font-black text-k5-acx">{field.label}:</span>
      {field.value ? (
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-[50px] min-w-0 flex-1 items-center gap-2 rounded-[14px] border-[3px] border-dashed border-k5-ac bg-k5-card px-2.5 py-1.5">
            <span aria-hidden="true" className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-k5-act text-k5-acx">
              <FileText className="h-4 w-4" />
            </span>
            <Tooltip>
              <TooltipTrigger delay={100} render={<span className="min-w-0 flex-1 truncate text-sm font-extrabold text-k5-ink" title={field.value} />}>
                {busy ? "Working…" : field.value}
              </TooltipTrigger>
              <TooltipContent>{field.value}</TooltipContent>
            </Tooltip>
          </div>
          <button type="button" onClick={() => onView(field)} disabled={!field.url} aria-label={`View ${field.label}`} title="View" className={`${ICON_BTN} bg-[#13803F]`}>
            <Eye className="h-5 w-5" aria-hidden="true" />
          </button>
          {actions && (
            <button type="button" onClick={() => onAskRemove(field)} disabled={Boolean(actions.busy)} aria-label={`Delete ${field.label}`} title="Delete" className={`${ICON_BTN} bg-[#DC2F45]`}>
              <Trash2 className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
        </div>
      ) : actions ? (
        <>
          <input
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,application/pdf"
            className="sr-only"
            disabled={Boolean(actions.busy)}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) choose(file);
            }}
          />
          <label htmlFor={inputId} className="flex h-[50px] cursor-pointer items-center justify-center gap-2 rounded-[14px] border-[3px] border-dashed border-k5-ac bg-k5-card px-3 text-sm font-black text-k5-acx hover:bg-k5-act">
            <Upload className="h-4 w-4" aria-hidden="true" />
            {busy ? "Uploading…" : "Upload"}
          </label>
        </>
      ) : (
        <span className="flex h-[50px] items-center justify-center rounded-[14px] border-[3px] border-dashed border-k5-line bg-k5-soft px-3 text-sm font-extrabold text-k5-mut">Not uploaded</span>
      )}
      <Purpose text={field.purpose} />
    </div>
  );
}

function ReadOnlyField({ field }) {
  const value = customDisplayValue(field);
  const wide = field.type === "checkbox" || field.type === "radio";
  return (
    <div className={`${LABEL} ${wide ? "col-span-full" : ""}`}>
      <span>{field.label}</span>
      <span className={`${RO} ${value ? "" : "text-k5-mut"}`}>{value || "—"}</span>
      <Purpose text={field.purpose} />
    </div>
  );
}

/** The custom fields of one section; nothing when the school has none for it. */
export function CustomFields({ fields, editor, actions }) {
  const [preview, setPreview] = useState(null);
  const [cropFor, setCropFor] = useState(null); // { field, file }
  const [confirm, setConfirm] = useState(null);
  if (!fields?.length) return null;

  const view = (field) => setPreview({ url: field.url, name: field.value, pdf: field.attachmentType === "P" || /\.pdf($|\?)/i.test(field.value), label: field.label });
  const askRemove = (field) =>
    setConfirm({
      message: "Are you sure you want to remove this document?",
      okLabel: "Yes, remove",
      cancel: () => setConfirm(null),
      accept: () => {
        setConfirm(null);
        actions.removeCustomFile(field.id);
      },
    });

  return (
    <>
      {HR}
      <div className={GRID3}>
        {fields.map((field) => {
          if (field.type === "file") {
            return <FileField key={field.id} field={field} actions={actions} onView={view} onCrop={(f, file) => setCropFor({ field: f, file })} onAskRemove={askRemove} />;
          }
          if (!editor) return <ReadOnlyField key={field.id} field={field} />;
          const key = `custom.${field.id}`;
          if (field.type === "checkbox" || field.type === "radio") return <ChoiceField key={field.id} field={field} editor={editor} />;
          if (field.type === "date") return <DateField key={field.id} field={field} editor={editor} />;
          return (
            <div key={field.id} className="flex min-w-0 flex-col gap-1.5">
              {field.type === "dropdown" ? (
                <EditSelect editor={editor} k={key} label={field.label} options={field.options.map((o) => ({ value: customOptionKey(o), label: o }))} />
              ) : (
                <EditText editor={editor} k={key} label={field.label} />
              )}
              <Purpose text={field.purpose} />
            </div>
          );
        })}
      </div>
      <DocCropDialog
        key={cropFor ? `${cropFor.field.id}-${cropFor.file.name}-${cropFor.file.lastModified}` : "none"}
        file={cropFor?.file ?? null}
        onCancel={() => setCropFor(null)}
        onCrop={(file) => {
          actions.uploadCustomFile(cropFor.field.id, file);
          setCropFor(null);
        }}
      />
      <DocPreviewDialog doc={preview} onClose={() => setPreview(null)} />
      <ConfirmDialog confirm={confirm} />
    </>
  );
}
