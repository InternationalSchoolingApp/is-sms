"use client";

import { useEffect, useRef } from "react";
import { CalendarDays, Check, Lock, MessageCircle, Siren, Undo2, X } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { EditableCallingTimes } from "@/components/k5/pages/K5ProfileEditorsP3";
import { useProfileMaster } from "@/hooks/useProfileEditor";
import { GENDERS, PARENTS, formatProfileDate, parseProfileDate, phoneDigits } from "@/utils/profileEdit";
import { dialCode } from "@/utils/profileModel";

/*
 * Editable pieces of the K–5 My Profile page (mockup .pfl / .pfin / .pffs): an input turns accent-bordered when
 * changed and shows a green tick (save this field) and a red cross (undo); grouped fields (phone, place, names,
 * hobbies, communication) get the same two buttons in a small bar under the group. Saving goes through
 * hooks/useProfileEditor.js.
 */

const GRID3 = "grid grid-cols-3 gap-x-4 gap-y-3.5 max-[1180px]:grid-cols-2 max-[600px]:grid-cols-1";
const GRID2 = "grid grid-cols-2 gap-x-4 gap-y-3.5 max-[600px]:grid-cols-1";
const H3 = "m-0 font-k5-display text-xl font-semibold text-k5-ink";
const HR = <hr className="my-1 h-[3px] rounded-[3px] border-none bg-k5-line" />;
const LABEL = "flex min-w-0 flex-col gap-1.5 text-sm font-black text-k5-mut";
const INPUT =
  "min-h-[50px] w-full min-w-0 rounded-[14px] border-[3px] bg-k5-card px-3.5 font-k5-body text-base font-extrabold text-k5-ink outline-none focus:border-k5-ac disabled:cursor-not-allowed disabled:bg-k5-soft";
const ICON_BTN = "flex h-[30px] w-[30px] flex-none cursor-pointer items-center justify-center rounded-[9px] border-none p-0 text-white disabled:cursor-wait disabled:opacity-60";

const req = <span className="text-k5-ri"> *</span>;

function border(st) {
  if (st.error) return "border-k5-ri";
  if (st.dirty || st.saved) return "border-k5-ac";
  return "border-k5-line";
}

/** Tick / cross inside an input (mockup .pffs), or the saved mark (.pffok). */
function InlineActions({ st, onSave, onUndo, offset = "end-2" }) {
  if (st.saved && !st.dirty) {
    return (
      <span role="status" aria-label="Saved!" className={`absolute top-1/2 ${offset} flex h-[30px] w-[30px] -translate-y-1/2 items-center justify-center rounded-[9px] bg-k5-act text-k5-acx`}>
        <Check className="h-4 w-4" strokeWidth={3.4} aria-hidden="true" />
      </span>
    );
  }
  if (!st.dirty) return null;
  return (
    <span className={`absolute top-1/2 ${offset} flex -translate-y-1/2 items-center gap-[5px]`}>
      <button type="button" onClick={onSave} disabled={st.saving} aria-label="Save this field" title="Save this field" className={`${ICON_BTN} bg-[#13803F] shadow-[0_2px_0_#0B5A2B]`}>
        <Check className="h-4 w-4" strokeWidth={3.4} aria-hidden="true" />
      </button>
      <button type="button" onClick={onUndo} disabled={st.saving} aria-label="Cancel change" title="Cancel change" className={`${ICON_BTN} bg-[#D3373C] shadow-[0_2px_0_#9E2226]`}>
        <X className="h-4 w-4" strokeWidth={3.4} aria-hidden="true" />
      </button>
    </span>
  );
}

function ErrorText({ st }) {
  return st.error ? <span className="text-[13px] font-black text-k5-ri">{st.error}</span> : null;
}

/** Save / Undo bar for a group of inputs. */
export function UnitBar({ editor, unit }) {
  const st = editor.status(unit);
  if (!st.dirty && !st.saved && !st.error) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {st.dirty ? (
        <>
          <button
            type="button"
            onClick={() => editor.save([unit])}
            disabled={st.saving}
            className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border-none bg-[#13803F] px-3.5 font-k5-display text-[15px] font-semibold text-white shadow-[0_3px_0_#0B5A2B] disabled:cursor-wait disabled:opacity-60"
          >
            <Check className="h-4 w-4" strokeWidth={3.2} aria-hidden="true" />
            {st.saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => editor.undo(unit)}
            disabled={st.saving}
            className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border-[3px] border-k5-line bg-k5-card px-3 font-k5-display text-[15px] font-semibold text-k5-ink"
          >
            <Undo2 className="h-4 w-4" aria-hidden="true" />
            Undo
          </button>
        </>
      ) : st.saved ? (
        <span role="status" className="inline-flex items-center gap-1 text-sm font-black text-k5-acx">
          <Check className="h-4 w-4" strokeWidth={3.2} aria-hidden="true" />
          Saved!
        </span>
      ) : null}
      <ErrorText st={st} />
    </div>
  );
}

export function EditText({ editor, k, label, required, type = "text", placeholder, wide, showError = true }) {
  const unit = editor.unitOf(k);
  const st = editor.status(unit);
  return (
    <label className={`${LABEL} ${wide ? "col-span-full" : ""}`}>
      <span>
        {label}
        {required && req}
      </span>
      <span className="relative block min-w-0">
        <input
          type={type}
          value={editor.draft[k] ?? ""}
          placeholder={placeholder}
          onChange={(e) => editor.set(k, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") editor.save([unit]);
            if (e.key === "Escape") editor.undo(unit);
          }}
          aria-invalid={Boolean(st.error)}
          className={`${INPUT} ${border(st)} ${st.dirty ? "pe-[82px]" : st.saved ? "pe-[46px]" : ""}`}
        />
        <InlineActions st={st} onSave={() => editor.save([unit])} onUndo={() => editor.undo(unit)} />
      </span>
      {showError && <ErrorText st={st} />}
    </label>
  );
}

function SelectBox({ value, onChange, options, placeholder = "Select", st, disabled, ariaLabel, className = "" }) {
  const list = options || [];
  const known = !value || list.some((o) => o.value === value);
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`${INPUT} cursor-pointer ${st ? border(st) : "border-k5-line"} ${className}`}
    >
      <option value="">{placeholder}</option>
      {!known && <option value={value}>{value}</option>}
      {list.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function EditSelect({ editor, k, label, required, options, loading }) {
  const unit = editor.unitOf(k);
  const st = editor.status(unit);
  return (
    <label className={LABEL}>
      <span>
        {label}
        {required && req}
      </span>
      <span className="relative block min-w-0">
        <SelectBox value={editor.draft[k]} onChange={(v) => editor.set(k, v)} options={options} st={st} placeholder={loading ? "Loading…" : "Select"} className={st.dirty ? "pe-[110px]" : ""} />
        <InlineActions st={st} onSave={() => editor.save([unit])} onUndo={() => editor.undo(unit)} offset="end-8" />
      </span>
      <ErrorText st={st} />
    </label>
  );
}

function EditDate({ editor, k, label, maxToday = true }) {
  const unit = editor.unitOf(k);
  return (
    <div className={LABEL}>
      <span>{label}</span>
      <DatePicker
        icon={CalendarDays}
        height="h-[50px]"
        value={parseProfileDate(editor.draft[k])}
        fromDate={new Date(1930, 0, 1)}
        toDate={maxToday ? new Date() : undefined}
        onChange={(date) => editor.set(k, formatProfileDate(date))}
      />
      <UnitBar editor={editor} unit={unit} />
    </div>
  );
}

function Locked({ label, value }) {
  return (
    <div className={LABEL}>
      <span>{label}</span>
      <span title="Only the school can change this" className="flex min-h-[50px] items-center gap-2 rounded-[14px] border-[3px] border-k5-line bg-k5-soft px-3.5 py-2 font-k5-body text-base font-extrabold text-k5-mut [overflow-wrap:anywhere]">
        <Lock className="h-4 w-4 flex-none" aria-hidden="true" />
        <span className="min-w-0 text-k5-ink">{value || "—"}</span>
      </span>
    </div>
  );
}

// Country-code options from the countries list (extra = ISO2, extra1 = "+ISD"); a few countries share an ISO code
// in that list, so each code appears once.
function useIsoOptions(countries) {
  const seen = new Set();
  return (countries || [])
    .filter((c) => c.extra && c.extra1)
    .map((c) => ({ value: String(c.extra).toLowerCase(), label: `${String(c.extra).toUpperCase()} ${c.extra1}` }))
    .filter((o) => (seen.has(o.value) ? false : seen.add(o.value)));
}

function Toggle({ on, onChange, children, icon: Icon }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm font-black text-k5-ink">
      <input type="checkbox" checked={Boolean(on)} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 flex-none cursor-pointer accent-[var(--k5-ac)]" />
      {Icon && <Icon className="h-4 w-4 flex-none text-k5-acx" aria-hidden="true" />}
      {children}
    </label>
  );
}

function EditPhone({ editor, label, keys, required, emergencyKey, verified }) {
  const [numKey, isoKey, waKey] = keys;
  const unit = editor.unitOf(numKey);
  const st = editor.status(unit);
  const isoOptions = useIsoOptions(editor.countries);
  const iso = editor.draft[isoKey] || "";
  const options = iso && !isoOptions.some((o) => o.value === iso) ? [{ value: iso, label: `${iso.toUpperCase()} ${dialCode(iso)}` }, ...isoOptions] : isoOptions;
  return (
    <div className={LABEL}>
      <span>
        {label}
        {required && req}
      </span>
      <div className="flex min-w-0 gap-2">
        <SelectBox value={iso} onChange={(v) => editor.set(isoKey, v)} options={options} placeholder="Code" st={st} ariaLabel={`${label} country code`} className="!w-[104px] flex-none !px-1.5 text-[15px]" />
        <input
          type="tel"
          inputMode="tel"
          value={editor.draft[numKey] ?? ""}
          onChange={(e) => editor.set(numKey, phoneDigits(e.target.value))}
          aria-label={label}
          aria-invalid={Boolean(st.error)}
          className={`${INPUT} ${border(st)}`}
        />
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <Toggle on={editor.draft[waKey]} onChange={(v) => editor.set(waKey, v)} icon={MessageCircle}>
          WhatsApp
        </Toggle>
        {emergencyKey && (
          <Toggle on={editor.draft[emergencyKey]} onChange={(v) => editor.set(emergencyKey, v)} icon={Siren}>
            Emergency Contact
          </Toggle>
        )}
        {verified && (
          <span className="ms-auto inline-flex min-h-7 items-center gap-1 rounded-full border-2 border-k5-ac bg-k5-act px-2.5 text-[13px] font-black text-k5-acx">
            <Check className="h-3.5 w-3.5" strokeWidth={3.4} aria-hidden="true" />
            Verified
          </span>
        )}
      </div>
      <UnitBar editor={editor} unit={unit} />
    </div>
  );
}

function EditPlace({ editor, keys, required }) {
  const [countryKey, stateKey, cityKey] = keys;
  const unit = editor.unitOf(countryKey);
  const st = editor.status(unit);
  const country = editor.draft[countryKey];
  const state = editor.draft[stateKey];
  const states = useProfileMaster("states", country);
  const cities = useProfileMaster("cities", state);
  const toOptions = (list) => (list || []).map((x) => ({ value: x.key, label: x.value }));
  const countries = toOptions(editor.countries);
  return (
    <>
      <label className={LABEL}>
        <span>
          Country{required && req}
        </span>
        <SelectBox value={country} onChange={(v) => editor.setMany({ [countryKey]: v, [stateKey]: "", [cityKey]: "" })} options={countries} st={st} placeholder={countries.length ? "Select" : "Loading…"} />
      </label>
      <label className={LABEL}>
        <span>
          State{required && req}
        </span>
        <SelectBox value={state} onChange={(v) => editor.setMany({ [stateKey]: v, [cityKey]: "" })} options={toOptions(states.data)} st={st} disabled={!country} placeholder={states.isFetching ? "Loading…" : "Select"} />
      </label>
      <label className={LABEL}>
        <span>
          City{required && req}
        </span>
        <SelectBox value={editor.draft[cityKey]} onChange={(v) => editor.set(cityKey, v)} options={toOptions(cities.data)} st={st} disabled={!state} placeholder={cities.isFetching ? "Loading…" : "Select"} />
      </label>
      {(st.dirty || st.saved || st.error) && (
        <div className="col-span-full">
          <UnitBar editor={editor} unit={unit} />
        </div>
      )}
    </>
  );
}

function ChipToggle({ on, onClick, children }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={Boolean(on)}
      onClick={onClick}
      className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-full border-[3px] py-1 pe-4 ps-3 font-k5-body text-[15px] font-black text-k5-ink transition-colors ${on ? "border-k5-ac bg-k5-act" : "border-k5-line bg-k5-card"}`}
    >
      <span aria-hidden="true" className={`flex h-5 w-5 flex-none items-center justify-center rounded-md border-2 ${on ? "border-k5-ac bg-k5-ac text-white" : "border-k5-line bg-k5-card"}`}>
        {on && <Check className="h-3.5 w-3.5" strokeWidth={3.6} />}
      </span>
      {children}
    </button>
  );
}

/** Section 1, editable. */
export function EditablePersonal({ m, editor }) {
  const p = m.personal;
  const timezones = useProfileMaster("timezones");
  const chosen = new Set(editor.draft.hobbies ? editor.draft.hobbies.split(",") : []);
  const toggleHobby = (hobbyId) => {
    const next = new Set(chosen);
    if (next.has(hobbyId)) next.delete(hobbyId);
    else next.add(hobbyId);
    editor.set("hobbies", [...next].sort().join(","));
  };
  const countries = (editor.countries || []).map((c) => ({ value: c.key, label: c.value }));
  return (
    <>
      <div className={GRID3}>
        <EditText editor={editor} k="firstName" label="First Name" required />
        <EditText editor={editor} k="middleName" label="Middle Name" />
        <EditText editor={editor} k="lastName" label="Last Name" required />
        <EditSelect editor={editor} k="gender" label="Gender" required options={GENDERS} />
        <Locked label="Date of Birth" value={p.dob} />
        <EditPhone editor={editor} label="Phone" keys={["phone", "phoneIso", "phoneWa"]} required verified={p.phoneVerified} />
        <EditPhone editor={editor} label="Alternate Phone" keys={["altPhone", "altPhoneIso", "altPhoneWa"]} />
        <Locked label="Email" value={p.email} />
        <EditText editor={editor} k="altEmail" label="Alternate Email" type="email" />
        <EditPlace editor={editor} keys={["country", "state", "city"]} required />
        <EditSelect
          editor={editor}
          k="timezone"
          label="Timezone"
          required
          loading={timezones.isFetching}
          options={(timezones.data || []).map((t) => ({ value: t.key, label: t.value }))}
        />
        <EditSelect editor={editor} k="nationality" label="Nationality" required options={countries} loading={!countries.length} />
      </div>
      <EditText editor={editor} k="address" label="Address" />
      {HR}
      <h3 className={H3}>Hobbies</h3>
      <div className="flex flex-wrap gap-2.5">
        {editor.hobbies.map((h) => (
          <ChipToggle key={h.id} on={chosen.has(h.id)} onClick={() => toggleHobby(h.id)}>
            {h.label}
          </ChipToggle>
        ))}
      </div>
      <UnitBar editor={editor} unit="hobbies" />
      {HR}
      <h3 className={H3}>Social Media Links</h3>
      <div className={GRID2}>
        {editor.social.map((s) => (
          <EditText key={s.id} editor={editor} k={`social.${s.id}`} label={`${s.label === "Twitter" ? "X (Twitter)" : s.label} Profile URL`} type="url" placeholder="https://" />
        ))}
      </div>
    </>
  );
}

function EditableParent({ editor, kind, title, email }) {
  const k = (f) => `${kind}.${f}`;
  return (
    <>
      <h3 className={H3}>{title}</h3>
      <div className={GRID3}>
        <EditText editor={editor} k={k("first")} label="First Name" />
        <EditText editor={editor} k={k("middle")} label="Middle Name" showError={false} />
        <EditText editor={editor} k={k("last")} label="Last Name" showError={false} />
        <EditPhone editor={editor} label="Phone Number" keys={[k("phone"), k("phoneIso"), k("wa")]} emergencyKey={k("emergency")} />
        <Locked label="Email" value={email} />
        <EditText editor={editor} k={k("facebook")} label="Facebook" />
        <EditPlace editor={editor} keys={[k("country"), k("state"), k("city")]} />
        <EditText editor={editor} k={k("occupation")} label="Occupation" />
        <EditDate editor={editor} k={k("dob")} label="Date of Birth" />
      </div>
    </>
  );
}

/** Section 2, editable (e-mails and the primary relation stay with the school). */
export function EditableParents({ m, editor, actions }) {
  const g = m.parents;
  const channels = [
    ["commWa", "WhatsApp"],
    ["commCall", "Phone"],
    ["commEmail", "Email"],
  ];
  return (
    <>
      {PARENTS.map((parent, i) => (
        <div key={parent.kind} className="flex flex-col gap-4">
          {i > 0 && HR}
          <EditableParent editor={editor} kind={parent.kind} title={parent.title} email={g[parent.kind].email} />
        </div>
      ))}
      {HR}
      <div className={GRID3}>
        <Locked label="Type of Relation (Primary Parent)" value={g.relation} />
        <EditDate editor={editor} k="anniversary" label="Wedding Anniversary Date" />
      </div>
      <h3 className={H3}>Communication</h3>
      <div className="flex flex-wrap gap-2.5">
        {channels.map(([key, label]) => (
          <ChipToggle key={key} on={editor.draft[key]} onClick={() => editor.set(key, !editor.draft[key])}>
            {label}
          </ChipToggle>
        ))}
      </div>
      <UnitBar editor={editor} unit="communication" />
      {HR}
      <h3 className={H3}>Communication Preferred Timing</h3>
      {actions ? (
        <EditableCallingTimes m={m} actions={actions} />
      ) : g.callingTimes.length ? (
        <div className="flex flex-wrap gap-2.5">
          {g.callingTimes.map((slot) => (
            <span key={slot} className="rounded-full border-[3px] border-k5-line bg-k5-soft px-4 py-2 text-[15px] font-black">
              {slot}
            </span>
          ))}
        </div>
      ) : (
        <p className="m-0 text-base font-extrabold text-k5-mut">No preferred timing added yet.</p>
      )}
    </>
  );
}

/** Timezone / nationality warning before saving (the existing page's showWarningMessageShow). */
export function ConfirmDialog({ confirm }) {
  const okRef = useRef(null);
  useEffect(() => {
    if (!confirm) return undefined;
    okRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && confirm.cancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirm]);
  if (!confirm) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(10,16,34,0.45)] p-4" onClick={confirm.cancel}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="k5-pf-confirm-h"
        aria-describedby="k5-pf-confirm-d"
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-[460px] flex-col gap-4 rounded-[26px] border-[3px] border-k5-ink bg-k5-card p-6 shadow-[0_6px_0_var(--k5-ink)]"
      >
        <h2 id="k5-pf-confirm-h" className="m-0 font-k5-display text-2xl font-semibold">
          Are you sure?
        </h2>
        <p id="k5-pf-confirm-d" className="m-0 text-base font-extrabold leading-[1.45]">
          {confirm.message}
        </p>
        <div className="flex flex-wrap justify-end gap-2.5">
          <button type="button" onClick={confirm.cancel} className="min-h-12 cursor-pointer rounded-full border-[3px] border-k5-line bg-k5-card px-5 font-k5-display text-[17px] font-semibold text-k5-ink">
            Cancel
          </button>
          <button
            ref={okRef}
            type="button"
            onClick={confirm.accept}
            className="min-h-12 cursor-pointer rounded-full border-[3px] border-k5-ac bg-k5-ac px-5 font-k5-display text-[17px] font-semibold text-white shadow-[0_4px_0_var(--k5-acd)]"
          >
            Yes, save
          </button>
        </div>
      </div>
    </div>
  );
}
