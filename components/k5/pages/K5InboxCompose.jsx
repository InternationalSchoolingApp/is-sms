"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, FileText, Lock, Paperclip, Send, Settings, X } from "lucide-react";
import { K5Loading, K5Sk } from "@/components/k5/K5Skeletons";
import { CM_BTN, CM_BTN_PRIMARY } from "@/components/k5/pages/K5InboxReader";
import {
  EMAIL_SETTINGS_ALWAYS, EMAIL_SETTINGS_INTRO, FILE_ACCEPT, FILE_HELP, MAX_MESSAGE, MAX_SUBJECT, PRIVACY_NOTE, TEMPLATE_HELP, fileSize, initialsOf,
} from "@/utils/inbox";

const FIELD = "k5-cm-in rounded-[14px] border-[3px] border-k5-line bg-k5-card text-[16px] font-extrabold text-k5-ink";
const HELP = "text-[14px] text-k5-mut";
const ALERT = "m-0 rounded-[14px] bg-k5-rt px-3.5 py-2.5 text-[14px] font-black text-k5-ri";

/** "Recipients": the chosen people as chips, a box to type a name in, and the list of everyone left to choose. */
function Recipients({ compose }) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const listId = useId();
  const needle = term.trim().toLowerCase();
  const people = compose.people.filter((p) => !needle || `${p.name} ${p.role} ${p.context || ""}`.toLowerCase().includes(needle));

  if (compose.isReply) {
    const person = compose.draft.to[0];
    return (
      <section className="flex flex-col gap-2">
        <span className="text-[14px] font-black text-k5-mut">To</span>
        <span className={`${FIELD} flex min-h-[50px] items-center gap-2 px-3`}>
          {person?.name}
          {person?.role && <span className="font-extrabold text-k5-mut">· {person.role}</span>}
        </span>
      </section>
    );
  }
  return (
    <section className="relative z-[3] flex flex-col gap-2">
      <div className={`${FIELD} flex min-h-[50px] flex-wrap items-center gap-1.5 px-2 py-1.5 ${compose.error?.field === "to" ? "border-k5-red" : ""}`}>
        {compose.draft.to.map((person) => (
          <span key={person.userId} className="flex items-center gap-1.5 rounded-full bg-k5-act py-1 pl-3 pr-1 text-[14px] font-black text-k5-acx">
            {person.name}
            <button type="button" aria-label={`Remove ${person.name}`} onClick={() => compose.removePerson(person.userId)} className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border-none bg-k5-card p-0 text-k5-ink">
              <X className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
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
          placeholder={compose.draft.to.length ? "Choose people, or type" : "Recipients"}
          aria-label="Recipients"
          className="min-h-[34px] min-w-[120px] flex-[1_1_160px] border-none bg-transparent text-[16px] font-extrabold text-k5-ink outline-none"
        />
        <button type="button" aria-label={open ? "Close the list" : "Choose people, or type"} aria-expanded={open} aria-controls={listId} onClick={() => setOpen((v) => !v)} className="flex h-[34px] w-[34px] cursor-pointer items-center justify-center border-none bg-transparent p-0">
          <ChevronDown className={`h-5 w-5 text-k5-ac transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={2.6} aria-hidden="true" />
        </button>
      </div>
      {open && (
        <div id={listId} className="flex max-h-[260px] flex-col gap-1 overflow-y-auto rounded-[18px] border-[3px] border-k5-line bg-k5-card p-2">
          {people.map((person) => (
            <button
              key={person.userId}
              type="button"
              onClick={() => {
                compose.addPerson(person);
                setTerm("");
              }}
              className="flex min-h-[48px] cursor-pointer items-center gap-3 rounded-[14px] border-none bg-transparent px-2.5 py-1.5 text-left text-k5-ink hover:bg-k5-soft"
            >
              <span aria-hidden="true" className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-k5-bt text-[13px] font-extrabold">{initialsOf(person.name)}</span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-[16px] font-black">{person.name}</span>
                <span className="truncate text-[14px] font-extrabold text-k5-mut">{person.context && person.context !== person.role ? `${person.role} · ${person.context}` : person.role}</span>
              </span>
            </button>
          ))}
          {people.length === 0 && <p className="m-0 px-2.5 py-3 text-[14px] font-extrabold text-k5-mut">{compose.people.length ? "No one matches that name." : "Nobody found."}</p>}
          <button type="button" onClick={() => setOpen(false)} className={`${CM_BTN} mt-1 self-end`}>Done</button>
        </div>
      )}
      <span className={HELP}>{compose.hint}</span>
    </section>
  );
}

/**
 * "New message" / "Reply" (designs: .cmdrawer): a panel on the right over the dimmed page. A native modal dialog,
 * so the page behind is inert and Esc closes it; closing keeps what was written, only Discard clears it.
 * It stays inside the shell in the page, so it takes the student's look (and the Balanced / Mature skin) with it.
 */
export function K5InboxCompose({ compose }) {
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
      className="fixed inset-y-4 left-auto right-4 m-0 hidden h-auto max-h-none w-[min(600px,calc(100%-32px))] max-w-none flex-col overflow-hidden overscroll-contain rounded-[26px] border-none bg-k5-page p-0 text-k5-ink shadow-[0_16px_40px_rgba(10,16,34,0.28)] backdrop:overflow-hidden backdrop:overscroll-contain backdrop:bg-[rgba(10,16,34,0.55)] open:flex max-[760px]:inset-2 max-[760px]:w-auto"
    >
      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={(event) => {
          event.preventDefault();
          compose.send();
        }}
      >
        <div className="flex flex-none items-center gap-3.5 bg-k5-ac px-5 py-4 text-white">
          <span aria-hidden="true" className="flex h-[46px] w-[46px] flex-none items-center justify-center rounded-full bg-white/[0.22] text-[15px] font-extrabold">{compose.initial}</span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <h2 id={titleId} className="m-0 font-k5-display text-[22px] font-semibold">{compose.title}</h2>
            {compose.from && <span className="truncate text-[14px] font-black">{compose.from}</span>}
          </div>
          <button type="button" aria-label="Close" onClick={compose.close} className="flex h-10 w-10 flex-none cursor-pointer items-center justify-center rounded-full border-2 border-white bg-k5-red p-0 text-white">
            <X className="h-[18px] w-[18px]" strokeWidth={3} aria-hidden="true" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-[18px]">
          {compose.note && <p role="status" className="m-0 rounded-[14px] border-[3px] border-k5-yb bg-k5-yt px-3.5 py-2.5 text-[14px] font-black text-k5-yx">{compose.note}</p>}
          <Recipients compose={compose} />
          {error?.field === "to" && <p role="alert" className={ALERT}>{error.message}</p>}

          <section className="flex flex-col gap-3.5 rounded-[26px] border-[3px] border-k5-line bg-k5-card px-[18px] py-4 shadow-[0_6px_0_var(--k5-line)]">
            <div className={`${FIELD} flex min-h-[50px] items-center gap-1.5 py-0 pl-3 pr-1 ${compose.isReply ? "bg-k5-soft" : ""} ${error?.field === "subject" ? "border-k5-red" : ""}`}>
              <input
                type="text"
                maxLength={MAX_SUBJECT}
                value={draft.subject}
                readOnly={compose.isReply}
                onChange={(e) => compose.setSubject(e.target.value)}
                aria-label="Subject"
                aria-invalid={error?.field === "subject" || undefined}
                placeholder="Subject: What is it about?"
                className="min-w-0 flex-1 self-stretch border-none bg-transparent text-[16px] font-extrabold text-k5-ink outline-none"
              />
              {/* Start from a template: the choice fills the subject and message and the picker goes back to its name. */}
              {compose.templateGroups.length > 0 && (
                <select
                  value=""
                  aria-label="Choose a template (optional)"
                  onChange={(e) => compose.applyTemplate(compose.templateGroups.flatMap((g) => g.templates).find((t) => String(t.id) === e.target.value))}
                  className="min-h-[32px] max-w-[150px] flex-none cursor-pointer border-y-0 border-l-[3px] border-r-0 border-k5-line bg-transparent px-2 text-[14px] font-black text-k5-ink outline-none"
                >
                  <option value="">Templates</option>
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
              )}
            </div>
            {compose.templateGroups.length > 0 && <span className={HELP}>{TEMPLATE_HELP}</span>}
            {error?.field === "subject" && <p role="alert" className={ALERT}>{error.message}</p>}
            <label className="flex flex-col gap-2">
              <textarea
                rows={9}
                maxLength={MAX_MESSAGE}
                value={draft.message}
                onChange={(e) => compose.setMessage(e.target.value)}
                aria-label="Message"
                aria-invalid={error?.field === "message" || undefined}
                placeholder="Message"
                className={`${FIELD} min-h-[220px] w-full resize-y p-3 leading-normal outline-none ${error?.field === "message" ? "border-k5-red" : ""}`}
              />
              <span className={`${HELP} self-end`}>{compose.counter}</span>
            </label>
            {error?.field === "message" && <p role="alert" className={ALERT}>{error.message}</p>}

            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <label className={`${CM_BTN} relative overflow-hidden`}>
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
                  <Paperclip className="h-[18px] w-[18px] flex-none text-k5-ac" strokeWidth={2.3} aria-hidden="true" />
                  Add attachments
                </label>
                <span className={HELP}>optional</span>
              </div>
              {draft.files.length > 0 && (
                <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                  {draft.files.map((file, index) => (
                    <li key={`${file.name}-${index}`} className="flex items-center gap-2.5 rounded-[14px] bg-k5-soft px-3 py-2 text-[14px] font-black">
                      <FileText className="h-5 w-5 flex-none text-k5-red" strokeWidth={2} aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate">{file.name}</span>
                      <span className="flex-none font-extrabold text-k5-mut">{fileSize(file.size)}</span>
                      <button type="button" aria-label={`Remove ${file.name}`} onClick={() => compose.removeFile(index)} className="flex h-7 w-7 flex-none cursor-pointer items-center justify-center rounded-full border-none bg-k5-card p-0 text-k5-ink">
                        <X className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <span className={HELP}>{FILE_HELP}</span>
              {error?.field === "files" && <p role="alert" className={ALERT}>{error.message}</p>}
            </div>
          </section>

          {/* The existing page's "Check before sending" warnings: they inform, they do not stop the send. */}
          {compose.warnings.map((warning) => (
            <p key={warning} role="note" className="m-0 rounded-[14px] border-[3px] border-k5-yb bg-k5-yt px-3.5 py-2.5 text-[14px] font-extrabold text-k5-yx">{warning}</p>
          ))}
          {error?.field === "send" && <p role="alert" className={ALERT}>{error.message}</p>}
        </div>

        <div className="flex flex-none flex-wrap items-center gap-3 border-t-[3px] border-k5-line bg-k5-card px-5 py-3.5 max-[760px]:[&>button]:flex-1 max-[760px]:[&>button]:justify-center">
          <span className={`${HELP} flex flex-[1_1_220px] items-start gap-1.5`}>
            <Lock className="mt-0.5 h-[15px] w-[15px] flex-none" strokeWidth={2.3} aria-hidden="true" />
            {PRIVACY_NOTE}
          </span>
          <button type="button" disabled={compose.isSending} onClick={compose.discard} className={CM_BTN}>Discard</button>
          <button type="submit" disabled={compose.isSending} className={CM_BTN_PRIMARY}>
            <Send className="h-[18px] w-[18px] flex-none" strokeWidth={2.3} aria-hidden="true" />
            {compose.isSending ? "Sending…" : "Send"}
          </button>
        </div>
      </form>
    </dialog>
  );
}

/**
 * "Email settings" (designs: the settings drawer): which optional emails also go to the student's own mailbox.
 * Everything still shows in the Inbox; a change is saved at once. Same panel and dialog rules as the composer.
 */
export function K5InboxSettings({ settings }) {
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
      className="fixed inset-y-4 left-auto right-4 m-0 hidden h-auto max-h-none w-[min(520px,calc(100%-32px))] max-w-none flex-col overflow-hidden overscroll-contain rounded-[26px] border-none bg-k5-card p-0 text-k5-ink shadow-[0_16px_40px_rgba(10,16,34,0.28)] backdrop:overflow-hidden backdrop:overscroll-contain backdrop:bg-[rgba(10,16,34,0.55)] open:flex max-[760px]:inset-2 max-[760px]:w-auto"
    >
      <div className="flex flex-none items-center gap-3 bg-k5-ac px-5 py-4 text-white">
        <Settings className="h-[22px] w-[22px] flex-none" strokeWidth={2} aria-hidden="true" />
        <h2 id={titleId} className="m-0 min-w-0 flex-1 font-k5-display text-[22px] font-semibold">Email settings</h2>
        <button type="button" autoFocus aria-label="Close" onClick={settings.close} className="flex h-10 w-10 flex-none cursor-pointer items-center justify-center rounded-full border-2 border-white bg-k5-red p-0 text-white">
          <X className="h-[18px] w-[18px]" strokeWidth={3} aria-hidden="true" />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
        <p className="m-0 text-[16px] font-extrabold">{EMAIL_SETTINGS_INTRO}</p>
        {settings.isLoading ? (
          <K5Loading label="Loading your email settings" className="flex flex-col gap-3">
            <K5Sk className="h-12 w-full" />
            <K5Sk className="h-12 w-full" />
          </K5Loading>
        ) : settings.error ? (
          <p role="alert" className={ALERT}>{settings.error}</p>
        ) : (
          <fieldset className="m-0 flex min-w-0 flex-col border-none p-0">
            <legend className="mb-2 p-0 text-[16px] font-black">Emails you can switch off</legend>
            {settings.rows.map((row) => (
              <label key={row.key} className="flex cursor-pointer items-start gap-3 border-b-[3px] border-k5-line py-3">
                <input
                  type="checkbox"
                  checked={row.on}
                  disabled={Boolean(settings.savingKey)}
                  onChange={(e) => settings.change(row.key, e.target.checked)}
                  className="m-0 mt-0.5 h-5 w-5 flex-none cursor-pointer accent-[var(--k5-ac)]"
                />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[16px] font-black">{row.label}</span>
                  <span className={HELP}>{row.hint}</span>
                </span>
              </label>
            ))}
          </fieldset>
        )}
        <p role="note" className="m-0 rounded-[14px] border-[3px] border-k5-yb bg-k5-yt px-4 py-3 text-[14px] font-extrabold text-k5-yx">{EMAIL_SETTINGS_ALWAYS}</p>
      </div>
    </dialog>
  );
}
