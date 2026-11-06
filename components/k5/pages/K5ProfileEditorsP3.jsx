"use client";

import { useId, useRef, useState } from "react";
import { CalendarDays, Clock, FileText, Plus, Trash2, Upload } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { EditSelect, EditText, UnitBar } from "@/components/k5/pages/K5ProfileEditors";
import { useProfileMaster } from "@/hooks/useProfileEditor";
import { REPORT_TYPES, formatProfileDate, parseProfileDate, reportDays, reportRange } from "@/utils/profileEdit";

/*
 * My Profile P3 editors on the K–5 page: previous school, documents, progress report frequency (section 3), live-class
 * times (4), sports, activities and clubs (5) and the parents' calling times (2). Field edits go through the editor
 * (hooks/useProfileEditor.js, tick / Bulk Save); list changes save at once (hooks/useProfileActions.js).
 */

const GRID3 = "grid grid-cols-3 gap-x-4 gap-y-3.5 max-[1180px]:grid-cols-2 max-[600px]:grid-cols-1";
const H3 = "m-0 font-k5-display text-xl font-semibold text-k5-ink";
const LABEL = "flex min-w-0 flex-col gap-1.5 text-sm font-black text-k5-mut";
const INPUT =
  "min-h-[50px] w-full min-w-0 rounded-[14px] border-[3px] border-k5-line bg-k5-card px-3.5 font-k5-body text-base font-extrabold text-k5-ink outline-none focus:border-k5-ac";
const ADD_BTN =
  "inline-flex min-h-[50px] cursor-pointer items-center justify-center gap-2 rounded-[14px] border-[3px] border-k5-ac bg-k5-ac px-4 font-k5-display text-base font-semibold text-white shadow-[0_4px_0_var(--k5-acd)] disabled:cursor-not-allowed disabled:opacity-50";
const REMOVE_BTN =
  "inline-flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-[10px] border-[3px] border-k5-ri bg-k5-rt p-0 text-k5-ri disabled:cursor-wait disabled:opacity-50";

// 10-minute steps for a whole day, as the existing page's generateTimeDropdown("12:00 AM", "11:59 PM", 10).
const TIME_OPTIONS = Array.from({ length: 144 }, (_, i) => {
  const h = Math.floor(i / 6);
  const m = (i % 6) * 10;
  const value = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  const label = `${String(h % 12 || 12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
  return { value, label };
});
const timeLabel = (value) => TIME_OPTIONS.find((t) => t.value === value)?.label || value;

function TimeSelect({ label, value, onChange }) {
  return (
    <label className={LABEL}>
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={`${INPUT} cursor-pointer`}>
        <option value="">Select</option>
        {TIME_OPTIONS.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Start / end (and, for calling times, who) + Add. */
function TimeRangeAdd({ onAdd, busy, roles }) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [role, setRole] = useState("");
  const wrong = start && end && end <= start;
  const ready = start && end && !wrong && (!roles || role);
  const add = async () => {
    if (!ready) return;
    const ok = await onAdd({ start, end, role });
    if (ok) {
      setStart("");
      setEnd("");
    }
  };
  return (
    <div className="flex flex-col gap-2">
      <div className={`${GRID3} items-end`}>
        {roles && (
          <label className={LABEL}>
            <span>Who</span>
            <select value={role} onChange={(e) => setRole(e.target.value)} className={`${INPUT} cursor-pointer`}>
              <option value="">Select</option>
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
        )}
        <TimeSelect label="Start time" value={start} onChange={setStart} />
        <TimeSelect label="End time" value={end} onChange={setEnd} />
        <div>
          <button type="button" onClick={add} disabled={!ready || busy} className={ADD_BTN}>
            <Plus className="h-5 w-5" strokeWidth={3} aria-hidden="true" />
            {busy ? "Saving…" : "Add time"}
          </button>
        </div>
      </div>
      {wrong && <span className="text-[13px] font-black text-k5-ri">The end time must be after the start time.</span>}
    </div>
  );
}

function SlotChip({ children, onRemove, busy, label }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border-[3px] border-k5-ac bg-k5-act py-1 pe-1 ps-3.5 text-[15px] font-black text-k5-ink">
      <Clock className="h-4 w-4 flex-none text-k5-acx" aria-hidden="true" />
      {children}
      <button type="button" onClick={onRemove} disabled={busy} aria-label={`Remove ${label}`} className={REMOVE_BTN}>
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </button>
    </span>
  );
}

/** Section 4: live-class preferred times. */
export function EditableTiming({ m, actions }) {
  const slots = m.timing.slots;
  return (
    <>
      {slots.length ? (
        <div className="flex flex-wrap gap-2.5">
          {slots.map((slot) => (
            <SlotChip key={slot.id} label={`${slot.start} - ${slot.end}`} busy={Boolean(actions.busy)} onRemove={() => actions.removeClassTime(slot.id)}>
              {slot.start} – {slot.end}
            </SlotChip>
          ))}
        </div>
      ) : (
        <p className="m-0 text-base font-extrabold text-k5-mut">No preferred class time added yet. When are you free for live classes?</p>
      )}
      <TimeRangeAdd busy={actions.busy === "time:add"} onAdd={({ start, end }) => actions.addClassTime(start, end)} />
    </>
  );
}

/** Section 2 (end): who may be called when. */
export function EditableCallingTimes({ m, actions }) {
  const slots = m.parents.callingSlots;
  return (
    <>
      {slots.length ? (
        <div className="flex flex-wrap gap-2.5">
          {slots.map((slot, i) => (
            <SlotChip key={`${slot.role}-${slot.start}-${slot.end}`} label={`${slot.role} ${timeLabel(slot.start)}`} busy={Boolean(actions.busy)} onRemove={() => actions.removeCallingTime(i)}>
              {slot.role}: {timeLabel(slot.start)} – {timeLabel(slot.end)}
            </SlotChip>
          ))}
        </div>
      ) : (
        <p className="m-0 text-base font-extrabold text-k5-mut">No preferred timing added yet.</p>
      )}
      <TimeRangeAdd roles={["Student", "Mother", "Father", "Guardian"]} busy={actions.busy === "call:add"} onAdd={({ role, start, end }) => actions.addCallingTime(role, start, end)} />
    </>
  );
}

/** Section 3: previous / current school. */
export function EditablePreviousSchool({ m, editor }) {
  const grades = useProfileMaster("grades");
  const year = new Date().getFullYear();
  const years = Array.from({ length: 22 }, (_, i) => String(year + 1 - i)).map((y) => ({ value: y, label: y }));
  const countries = (editor.countries || []).map((c) => ({ value: c.key, label: c.value }));
  return (
    <div className={GRID3}>
      <EditText editor={editor} k="prevSchool" label="Previous/Current School Name" />
      <EditSelect editor={editor} k="prevGrade" label="Previous/Current Grade Name" options={(grades.data || []).map((g) => ({ value: g.key, label: g.value }))} loading={grades.isFetching} />
      <EditSelect editor={editor} k="gradYear" label="Previous/Current School Graduation Year" options={years} />
      <EditSelect editor={editor} k="prevCountry" label="Previous/Current School Country" options={countries} loading={!countries.length} />
      <div className={LABEL}>
        <span>CTI Taken Recommended Grade</span>
        <span className="flex min-h-[50px] items-center rounded-[14px] border-[3px] border-k5-line bg-k5-soft px-3.5 font-k5-body text-base font-extrabold text-k5-ink">{m.academic.ctiRecommendedGrade}</span>
      </div>
    </div>
  );
}

// Backend docType for each document of the profile (the parent passport is stored as "Signature").
const DOC_TYPE = { ageProof: "Age Proof", addressProof: "Address Proof", parentPassportProof: "Signature", lastAcademicProof: "Last Academic Proof" };

function DocTile({ doc, actions }) {
  const inputId = useId();
  const input = useRef(null);
  const docType = DOC_TYPE[doc.key];
  const working = actions.busy === `doc:${docType}`;
  const choose = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) actions.uploadDocument(docType, file);
  };
  return (
    <div className="flex flex-col gap-1.5 text-sm font-black text-k5-mut">
      <span>{doc.label}</span>
      <input ref={input} id={inputId} type="file" accept="image/jpeg,image/png,application/pdf" onChange={choose} className="sr-only" disabled={Boolean(actions.busy)} />
      {doc.url ? (
        <div className="flex gap-2">
          <a
            href={doc.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[50px] flex-1 items-center justify-center gap-2 rounded-[14px] border-[3px] border-k5-ac bg-k5-act px-3 text-base font-black text-k5-acx no-underline"
          >
            <FileText className="h-5 w-5 flex-none" aria-hidden="true" />
            View<span className="sr-only"> {doc.label}</span>
          </a>
          <label htmlFor={inputId} title="Replace" className="flex h-[50px] w-[50px] flex-none cursor-pointer items-center justify-center rounded-[14px] border-[3px] border-k5-line bg-k5-soft text-k5-acx">
            <Upload className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">Replace {doc.label}</span>
          </label>
          <button type="button" onClick={() => actions.removeDocument(docType)} disabled={Boolean(actions.busy)} aria-label={`Remove ${doc.label}`} className={`${REMOVE_BTN} !h-[50px] !w-[50px] !rounded-[14px]`}>
            <Trash2 className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          className="flex min-h-[50px] cursor-pointer items-center justify-center gap-2 rounded-[14px] border-[3px] border-dashed border-k5-line bg-k5-soft px-3 text-base font-black text-k5-acx hover:border-k5-ac"
        >
          <Upload className="h-5 w-5" aria-hidden="true" />
          {working ? "Uploading…" : "Upload"}
        </label>
      )}
      {working && doc.url && <span className="text-[13px] font-black text-k5-acx">Working…</span>}
    </div>
  );
}

/** Section 3: the four documents (JPG / PNG / PDF, up to 5 MB). */
export function EditableDocuments({ m, actions }) {
  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-3">
        {m.academic.documents.map((doc) => (
          <DocTile key={doc.key} doc={doc} actions={actions} />
        ))}
      </div>
      <p className="m-0 text-[13px] font-extrabold text-k5-mut">JPG, PNG or PDF, up to 5 MB.</p>
    </>
  );
}

/** Section 3: Set Progress Report (mockup .pfrep radio cards). */
export function ProgressReportPicker({ editor }) {
  const days = reportDays(editor.draft.reportType);
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <h3 className={H3}>Set Progress Report</h3>
        <span className="rounded-full border-2 border-k5-line bg-k5-soft px-3 py-1 text-sm font-black text-k5-ink">{reportRange(days)}</span>
      </div>
      <div role="radiogroup" aria-label="Set Progress Report" className={GRID3}>
        {REPORT_TYPES.map((r) => {
          const on = r.days === days;
          return (
            <button
              key={r.days}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => editor.set("reportType", String(r.days))}
              className={`flex min-h-[72px] cursor-pointer items-center gap-3 rounded-[18px] border-[3px] px-3.5 py-2.5 text-start font-k5-body text-k5-ink ${on ? "border-k5-ac bg-k5-act" : "border-k5-line bg-k5-card"}`}
            >
              <span aria-hidden="true" className={`flex h-11 w-11 flex-none items-center justify-center rounded-[14px] ${on ? "bg-k5-ac text-white" : "bg-k5-soft text-k5-acx"}`}>
                <CalendarDays className="h-6 w-6" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-k5-display text-lg font-semibold">{r.name}</span>
                <span className="text-sm font-extrabold text-k5-mut">{r.every}</span>
              </span>
              <span aria-hidden="true" className={`flex h-6 w-6 flex-none items-center justify-center rounded-full border-[3px] ${on ? "border-k5-ac" : "border-k5-line"}`}>
                {on && <span className="h-2.5 w-2.5 rounded-full bg-k5-ac" />}
              </span>
            </button>
          );
        })}
      </div>
      <UnitBar editor={editor} unit="reportType" />
    </>
  );
}

function ClubChip({ on, onClick, children }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={Boolean(on)}
      onClick={onClick}
      className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-full border-[3px] py-1 pe-4 ps-3 font-k5-body text-[15px] font-black text-k5-ink ${on ? "border-k5-ac bg-k5-act" : "border-k5-line bg-k5-card"}`}
    >
      <span aria-hidden="true" className={`flex h-5 w-5 flex-none items-center justify-center rounded-md border-2 text-xs ${on ? "border-k5-ac bg-k5-ac text-white" : "border-k5-line bg-k5-card"}`}>
        {on ? "✓" : ""}
      </span>
      {children}
    </button>
  );
}

/** Section 5: sport & activities (saved at once) and clubs (tick / Bulk Save). */
export function EditableSports({ m, editor, actions }) {
  const joined = m.sports.joined;
  const [open, setOpen] = useState(false);
  const showForm = open || joined.length > 0;
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [place, setPlace] = useState("");
  const chosen = new Set(editor.draft.clubs ? editor.draft.clubs.split(",") : []);
  const toggleClub = (clubId) => {
    const next = new Set(chosen);
    if (next.has(clubId)) next.delete(clubId);
    else next.add(clubId);
    editor.set("clubs", [...next].sort().join(","));
  };
  const add = async () => {
    const ok = await actions.addActivity({ title, startDate: start, endDate: end, address: place });
    if (ok) {
      setTitle("");
      setStart("");
      setEnd("");
      setPlace("");
    }
  };
  const ready = title.trim() && start && end && place.trim();
  return (
    <>
      <p className="m-0 text-[17px] font-extrabold">Please click &apos;Yes&apos; if you take part in any sport or extracurricular activities.</p>
      <button
        type="button"
        role="switch"
        aria-checked={showForm}
        disabled={joined.length > 0}
        onClick={() => setOpen((v) => !v)}
        className={`flex min-h-12 cursor-pointer items-center gap-2.5 self-start rounded-full border-[3px] py-1 pe-4 ps-1 font-k5-display text-[17px] font-semibold text-k5-ink disabled:cursor-default ${showForm ? "border-k5-ac bg-k5-act" : "border-k5-line bg-k5-card"}`}
      >
        <span className={`relative block h-8 w-14 rounded-full transition-colors ${showForm ? "bg-k5-ac" : "bg-k5-line"}`}>
          <span className={`absolute top-1 block h-6 w-6 rounded-full bg-white shadow transition-[inset-inline-start] ${showForm ? "start-[28px]" : "start-1"}`} />
        </span>
        {showForm ? "Yes" : "No"}
      </button>
      {joined.length > 0 && (
        <div className="flex flex-col gap-2.5">
          {joined.map((row) => (
            <div key={row.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-[18px] border-[3px] border-k5-line bg-k5-card py-2.5 pe-2.5 ps-4 text-[15px] font-extrabold">
              <strong className="font-k5-display text-[17px] font-semibold">{row.title || "Activity"}</strong>
              {(row.start || row.end) && <span className="text-k5-mut">{[row.start, row.end].filter(Boolean).join(" – ")}</span>}
              {row.place && <span className="min-w-0 flex-1 text-k5-mut [overflow-wrap:anywhere]">{row.place}</span>}
              <button type="button" onClick={() => actions.removeActivity(row.id)} disabled={Boolean(actions.busy)} aria-label={`Remove ${row.title || "activity"}`} className={`${REMOVE_BTN} ms-auto`}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}
      {showForm && (
        <div className="flex flex-col gap-3 rounded-[18px] border-[3px] border-dashed border-k5-line p-3.5">
          <div className={GRID3}>
            <label className={LABEL}>
              <span>Sport or activity</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} className={INPUT} />
            </label>
            <div className={LABEL}>
              <span>Start date</span>
              <DatePicker icon={CalendarDays} height="h-[50px]" value={parseProfileDate(start)} fromDate={new Date(2000, 0, 1)} toDate={new Date(new Date().getFullYear() + 1, 11, 31)} onChange={(d) => setStart(formatProfileDate(d))} />
            </div>
            <div className={LABEL}>
              <span>End date</span>
              <DatePicker icon={CalendarDays} height="h-[50px]" value={parseProfileDate(end)} fromDate={parseProfileDate(start) || new Date(2000, 0, 1)} toDate={new Date(new Date().getFullYear() + 1, 11, 31)} onChange={(d) => setEnd(formatProfileDate(d))} />
            </div>
            <label className={`${LABEL} col-span-2 max-[600px]:col-span-1`}>
              <span>Where</span>
              <input value={place} onChange={(e) => setPlace(e.target.value)} maxLength={300} className={INPUT} />
            </label>
            <div className="flex items-end">
              <button type="button" onClick={add} disabled={!ready || Boolean(actions.busy)} className={ADD_BTN}>
                <Plus className="h-5 w-5" strokeWidth={3} aria-hidden="true" />
                {actions.busy === "activity:add" ? "Saving…" : "Add activity"}
              </button>
            </div>
          </div>
        </div>
      )}
      <hr className="my-1 h-[3px] rounded-[3px] border-none bg-k5-line" />
      <h3 className={H3}>Would you like to join any extracurricular activities?</h3>
      <div className="flex flex-wrap gap-2.5">
        {editor.clubs.map((c) => (
          <ClubChip key={c.id} on={chosen.has(c.id)} onClick={() => toggleClub(c.id)}>
            {c.label}
          </ClubChip>
        ))}
      </div>
      <UnitBar editor={editor} unit="clubs" />
    </>
  );
}
