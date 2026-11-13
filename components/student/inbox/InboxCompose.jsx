"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, FileText, Lock, Paperclip, Send, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EMAIL_SETTINGS_ALWAYS, EMAIL_SETTINGS_INTRO, FILE_ACCEPT, FILE_HELP, MAX_MESSAGE, MAX_SUBJECT, PRIVACY_NOTE, TEMPLATE_HELP, fileSize } from "@/utils/inbox";

const BTN = "inline-flex min-h-10 cursor-pointer items-center gap-2 whitespace-nowrap rounded-md border border-slate-300 bg-white px-3.5 text-sm font-semibold text-black disabled:cursor-default disabled:opacity-45";
const BTN_PRIMARY = "inline-flex min-h-10 cursor-pointer items-center gap-2 whitespace-nowrap rounded-md border border-primary bg-primary px-4 text-sm font-semibold text-white disabled:cursor-default disabled:opacity-45";
const FIELD = "w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-black outline-none focus:border-primary";
const HELP = "text-xs text-black/60";
const ALERT = "m-0 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700";
const NOTE = "m-0 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-black";

function Recipients({ compose }) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const listId = useId();
  const needle = term.trim().toLowerCase();
  const people = compose.people.filter((p) => !needle || `${p.name} ${p.role} ${p.context || ""}`.toLowerCase().includes(needle));

  if (compose.isReply) {
    const person = compose.draft.to[0];
    return (
      <div className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-black">To</span>
        <span className={`${FIELD} flex min-h-10 items-center gap-2 bg-slate-50`}>
          {person?.name}
          {person?.role && <span className="text-black/60">· {person.role}</span>}
        </span>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-semibold text-black">To</span>
      <div className={`${FIELD} flex min-h-10 flex-wrap items-center gap-1.5 px-2 py-1 ${compose.error?.field === "to" ? "border-red-500" : ""}`}>
        {compose.draft.to.map((person) => (
          <span key={person.userId} className="flex items-center gap-1 rounded-full bg-primary/10 py-0.5 pl-2.5 pr-1 text-xs font-semibold text-primary">
            {person.name}
            <button type="button" aria-label={`Remove ${person.name}`} onClick={() => compose.removePerson(person.userId)} className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border-none bg-white p-0 text-black">
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Choose people, or type a name"
          aria-label="Recipients"
          className="min-h-8 min-w-[120px] flex-[1_1_160px] border-none bg-transparent text-sm text-black outline-none"
        />
        <button type="button" aria-label={open ? "Close the list" : "Choose people"} aria-expanded={open} aria-controls={listId} onClick={() => setOpen((v) => !v)} className="flex h-8 w-8 cursor-pointer items-center justify-center border-none bg-transparent p-0">
          <ChevronDown className={`h-4 w-4 text-primary transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
        </button>
      </div>
      {open && (
        <div id={listId} className="flex max-h-[240px] flex-col overflow-y-auto rounded-md border border-slate-200 bg-white p-1">
          {people.map((person) => (
            <button
              key={person.userId}
              type="button"
              onClick={() => {
                compose.addPerson(person);
                setTerm("");
              }}
              className="flex cursor-pointer flex-col rounded-md border-none bg-transparent px-2.5 py-1.5 text-left hover:bg-slate-100"
            >
              <span className="text-sm font-semibold text-black">{person.name}</span>
              <span className="text-xs text-black/60">{person.context && person.context !== person.role ? `${person.role} · ${person.context}` : person.role}</span>
            </button>
          ))}
          {people.length === 0 && <p className="m-0 px-2.5 py-2 text-sm text-black/60">{compose.people.length ? "No one matches that name." : "Nobody found."}</p>}
          <button type="button" onClick={() => setOpen(false)} className={`${BTN} m-1 self-end`}>Done</button>
        </div>
      )}
      <span className={HELP}>{compose.hint}</span>
    </div>
  );
}

/**
 * "New message" / "Reply" in the standard shell: the same panel and rules as the grade looks
 * (components/k5/pages/K5InboxCompose.jsx), in the standard colours. A native modal dialog on the right;
 * closing keeps what was written, only Discard clears it.
 */
export function InboxCompose({ compose }) {
  const ref = useRef(null);
  const titleId = useId();
  const { draft, error } = compose;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (compose.isOpen && !dialog.open) {
      dialog.showModal();
      // Where the student starts typing, as on the existing page: the message for a reply, the people for a new one.
      dialog.querySelector(compose.isReply ? "textarea" : 'input[aria-label="Recipients"]')?.focus();
    }
    if (!compose.isOpen && dialog.open) dialog.close();
  }, [compose.isOpen, compose.isReply]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={compose.close}
      className="fixed inset-y-3 left-auto right-3 m-0 hidden h-auto max-h-none w-[min(560px,calc(100%-24px))] max-w-none flex-col overflow-hidden overscroll-contain rounded-[10px] border border-slate-200 bg-white p-0 text-black shadow-xl backdrop:overflow-hidden backdrop:overscroll-contain backdrop:bg-black/40 open:flex"
    >
      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={(event) => {
          event.preventDefault();
          compose.send();
        }}
      >
        <div className="flex flex-none items-center gap-3 bg-primary px-4 py-3 text-white">
          <div className="flex min-w-0 flex-1 flex-col">
            <h2 id={titleId} className="m-0 text-lg font-bold">{compose.title}</h2>
            {compose.from && <span className="truncate text-xs">{compose.from}</span>}
          </div>
          <button type="button" aria-label="Close" onClick={compose.close} className="flex h-8 w-8 flex-none cursor-pointer items-center justify-center rounded-full border border-white/70 bg-transparent p-0 text-white">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
          {compose.note && <p role="status" className={NOTE}>{compose.note}</p>}
          <Recipients compose={compose} />
          {error?.field === "to" && <p role="alert" className={ALERT}>{error.message}</p>}
          {compose.templateGroups.length > 0 && (
            <label className="flex flex-col gap-1 text-sm font-semibold text-black">
              Start from a template
              <select value="" onChange={(e) => compose.applyTemplate(compose.templateGroups.flatMap((g) => g.templates).find((t) => String(t.id) === e.target.value))} className={`${FIELD} min-h-10 font-normal`}>
                <option value="">Choose a template (optional)</option>
                {compose.templateGroups.map((group) =>
                  group.label ? (
                    <optgroup key={group.label} label={group.label}>
                      {group.templates.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                    </optgroup>
                  ) : (
                    group.templates.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)
                  ),
                )}
              </select>
              <span className={`${HELP} font-normal`}>{TEMPLATE_HELP}</span>
            </label>
          )}
          <label className="flex flex-col gap-1 text-sm font-semibold text-black">
            Subject
            <input
              type="text"
              maxLength={MAX_SUBJECT}
              value={draft.subject}
              readOnly={compose.isReply}
              onChange={(e) => compose.setSubject(e.target.value)}
              aria-invalid={error?.field === "subject" || undefined}
              placeholder="What is it about?"
              className={`${FIELD} min-h-10 font-normal read-only:bg-slate-50 ${error?.field === "subject" ? "border-red-500" : ""}`}
            />
          </label>
          {error?.field === "subject" && <p role="alert" className={ALERT}>{error.message}</p>}
          <label className="flex flex-col gap-1 text-sm font-semibold text-black">
            Message
            <textarea
              rows={9}
              maxLength={MAX_MESSAGE}
              value={draft.message}
              onChange={(e) => compose.setMessage(e.target.value)}
              aria-invalid={error?.field === "message" || undefined}
              className={`${FIELD} min-h-[200px] resize-y py-2 font-normal leading-normal ${error?.field === "message" ? "border-red-500" : ""}`}
            />
            <span className={`${HELP} self-end font-normal`}>{compose.counter}</span>
          </label>
          {error?.field === "message" && <p role="alert" className={ALERT}>{error.message}</p>}

          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <label className={`${BTN} relative overflow-hidden`}>
                <input
                  type="file"
                  multiple
                  accept={FILE_ACCEPT}
                  aria-label="Add attachments"
                  onChange={(e) => {
                    compose.addFiles(e.target.files);
                    e.target.value = "";
                  }}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
                <Paperclip className="h-4 w-4 text-primary" aria-hidden="true" />
                Add attachments
              </label>
              <span className={HELP}>optional</span>
            </div>
            {draft.files.length > 0 && (
              <ul className="m-0 flex list-none flex-col gap-1 p-0">
                {draft.files.map((file, index) => (
                  <li key={`${file.name}-${index}`} className="flex items-center gap-2 rounded-md bg-slate-50 px-2.5 py-1.5 text-sm text-black">
                    <FileText className="h-4 w-4 flex-none text-red-600" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate">{file.name}</span>
                    <span className="flex-none text-xs text-black/60">{fileSize(file.size)}</span>
                    <button type="button" aria-label={`Remove ${file.name}`} onClick={() => compose.removeFile(index)} className="flex h-6 w-6 flex-none cursor-pointer items-center justify-center rounded-full border-none bg-white p-0 text-black">
                      <X className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <span className={HELP}>{FILE_HELP}</span>
            {error?.field === "files" && <p role="alert" className={ALERT}>{error.message}</p>}
          </div>

          {compose.warnings.map((warning) => <p key={warning} role="note" className={NOTE}>{warning}</p>)}
          {error?.field === "send" && <p role="alert" className={ALERT}>{error.message}</p>}
        </div>

        <div className="flex flex-none flex-wrap items-center gap-2.5 border-t border-slate-200 px-4 py-3">
          <span className={`${HELP} flex flex-[1_1_200px] items-start gap-1.5`}>
            <Lock className="mt-0.5 h-3.5 w-3.5 flex-none" aria-hidden="true" />
            {PRIVACY_NOTE}
          </span>
          <button type="button" disabled={compose.isSending} onClick={compose.discard} className={BTN}>Discard</button>
          <button type="submit" disabled={compose.isSending} className={BTN_PRIMARY}>
            <Send className="h-4 w-4" aria-hidden="true" />
            {compose.isSending ? "Sending…" : "Send"}
          </button>
        </div>
      </form>
    </dialog>
  );
}

/** "Email settings" in the standard shell: the same panel and rules as K5InboxSettings, in the standard colours. */
export function InboxSettings({ settings }) {
  const ref = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (settings.isOpen && !dialog.open) dialog.showModal();
    if (!settings.isOpen && dialog.open) dialog.close();
  }, [settings.isOpen]);

  return (
    <dialog
      ref={ref}
      closedby="any"
      aria-labelledby={titleId}
      onClose={settings.close}
      className="fixed inset-y-3 left-auto right-3 m-0 hidden h-auto max-h-none w-[min(480px,calc(100%-24px))] max-w-none flex-col overflow-hidden overscroll-contain rounded-[10px] border border-slate-200 bg-white p-0 text-black shadow-xl backdrop:overflow-hidden backdrop:overscroll-contain backdrop:bg-black/40 open:flex"
    >
      <div className="flex flex-none items-center gap-3 bg-primary px-4 py-3 text-white">
        <h2 id={titleId} className="m-0 min-w-0 flex-1 text-lg font-bold">Email settings</h2>
        <button type="button" autoFocus aria-label="Close" onClick={settings.close} className="flex h-8 w-8 flex-none cursor-pointer items-center justify-center rounded-full border border-white/70 bg-transparent p-0 text-white">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
        <p className="m-0 text-sm text-black">{EMAIL_SETTINGS_INTRO}</p>
        {settings.isLoading ? (
          <div role="status" aria-busy="true" className="flex flex-col gap-2">
            <span className="sr-only">Loading your email settings…</span>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : settings.error ? (
          <p role="alert" className={ALERT}>{settings.error}</p>
        ) : (
          <fieldset className="m-0 flex min-w-0 flex-col border-none p-0">
            <legend className="mb-1 p-0 text-sm font-semibold text-black">Emails you can switch off</legend>
            {settings.rows.map((row) => (
              <label key={row.key} className="flex cursor-pointer items-start gap-2.5 border-b border-slate-200 py-2.5">
                <input type="checkbox" checked={row.on} disabled={Boolean(settings.savingKey)} onChange={(e) => settings.change(row.key, e.target.checked)} className="mt-0.5 h-4 w-4 flex-none cursor-pointer accent-primary" />
                <span className="flex min-w-0 flex-col">
                  <span className="text-sm font-semibold text-black">{row.label}</span>
                  <span className={HELP}>{row.hint}</span>
                </span>
              </label>
            ))}
          </fieldset>
        )}
        <p role="note" className={NOTE}>{EMAIL_SETTINGS_ALWAYS}</p>
      </div>
    </dialog>
  );
}
