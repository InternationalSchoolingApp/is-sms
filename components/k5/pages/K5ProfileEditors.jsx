"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { CalendarDays, Check, Lock, Plus, Siren, Trash2, Undo2, X } from "lucide-react";
import { IoLogoWhatsapp } from "react-icons/io";
import { useTranslations } from "next-intl";
import { useLabelTranslator } from "@/i18n/labels";
import { DatePicker } from "@/components/ui/date-picker";
import { FloatingLabelSelect } from "@/components/ui/floating-label-select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EditableCallingTimes } from "@/components/k5/pages/K5ProfileEditorsP3";
import { OtpControl } from "@/components/k5/pages/K5ProfileOtp";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useIntlTelInput } from "@/hooks/useIntlTelInput";
import { useProfileMaster } from "@/hooks/useProfileEditor";
import { GENDERS, PARENTS, formatProfileDate, parseProfileDate } from "@/utils/profileEdit";
import { NAME_MAX_LENGTH, isNameKeyAllowed, sanitizeName } from "@/utils/nameInput";

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
const LABEL = "relative flex min-w-0 flex-col gap-1.5 text-sm font-black text-k5-mut";
const INPUT =
  "h-[50px] w-full min-w-0 rounded-[14px] border-[3px] bg-k5-card px-3.5 pt-1 font-k5-body text-base font-extrabold text-k5-ink outline-none focus:border-k5-ac disabled:cursor-not-allowed disabled:bg-k5-soft";
const ICON_BTN = "flex h-[30px] w-[30px] flex-none cursor-pointer items-center justify-center rounded-[9px] border-none p-0 text-white disabled:cursor-wait disabled:opacity-60";

const req = <span className="text-k5-ri"> *</span>;

// "Mother: 09:00 AM - 10:00 AM" (utils/profileModel.js callingTimes) with the role in the dashboard language.
export function useCallingSlotText() {
  const t = useTranslations("k5Profile");
  const tr = useLabelTranslator("k5Profile.roles");
  return (slot) => {
    const m = /^([^:]+): (.+)$/.exec(String(slot));
    return m ? t("callingSlot", { role: tr(m[1]), range: m[2] }) : slot;
  };
}

function border(st) {
  if (st.error) return "border-k5-ri";
  if (st.dirty || st.saved) return "border-k5-ac";
  return "border-k5-line";
}

/** Tick / cross inside an input (mockup .pffs), or the saved mark (.pffok). */
function InlineActions({ st, onSave, onUndo, offset = "end-2" }) {
  const t = useTranslations("k5Profile");
  if (st.saved && !st.dirty) {
    return (
      <span role="status" aria-label={t("editor.saved")} className={`absolute top-1/2 ${offset} flex h-[30px] w-[30px] -translate-y-1/2 items-center justify-center rounded-[9px] bg-k5-act text-k5-acx`}>
        <Check className="h-4 w-4" strokeWidth={3.4} aria-hidden="true" />
      </span>
    );
  }
  if (!st.dirty) return null;
  return (
    <span className={`absolute top-1/2 ${offset} flex -translate-y-1/2 items-center gap-[5px]`}>
      <button type="button" onClick={onSave} disabled={st.saving} aria-label={t("editor.saveField")} title={t("editor.saveField")} className={`${ICON_BTN} bg-[#13803F] shadow-[0_2px_0_#0B5A2B]`}>
        <Check className="h-4 w-4" strokeWidth={3.4} aria-hidden="true" />
      </button>
      <button type="button" onClick={onUndo} disabled={st.saving} aria-label={t("editor.cancelChange")} title={t("editor.cancelChange")} className={`${ICON_BTN} bg-[#D3373C] shadow-[0_2px_0_#9E2226]`}>
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
  const t = useTranslations("k5Profile");
  const tc = useTranslations("common");
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
            {st.saving ? tc("status.saving") : tc("actions.save")}
          </button>
          <button
            type="button"
            onClick={() => editor.undo(unit)}
            disabled={st.saving}
            className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border-[3px] border-k5-line bg-k5-card px-3 font-k5-display text-[15px] font-semibold text-k5-ink"
          >
            <Undo2 className="h-4 w-4" aria-hidden="true" />
            {t("editor.undo")}
          </button>
        </>
      ) : st.saved ? (
        <span role="status" className="inline-flex items-center gap-1 text-sm font-black text-k5-acx">
          <Check className="h-4 w-4" strokeWidth={3.2} aria-hidden="true" />
          {t("editor.saved")}
        </span>
      ) : null}
      <ErrorText st={st} />
    </div>
  );
}

/** name: a person's name (letters and spaces only, like the existing page's M.isChars). */
export function EditText({ editor, k, label, required, type = "text", placeholder, wide, showError = true, name = false }) {
  const unit = editor.unitOf(k);
  const st = editor.status(unit);
  const value = editor.draft[k] ?? "";
  const [focused, setFocused] = useState(false);
  const floated = focused || Boolean(value);
  return (
    <label className={`${LABEL} ${wide ? "col-span-full" : ""}`}>
      <span className="relative block min-w-0">
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          maxLength={name ? NAME_MAX_LENGTH : undefined}
          onChange={(e) => editor.set(k, name ? sanitizeName(e.target.value).slice(0, NAME_MAX_LENGTH) : e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") editor.save([unit]);
            else if (e.key === "Escape") editor.undo(unit);
            else if (name && !isNameKeyAllowed(e)) e.preventDefault();
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          aria-invalid={Boolean(st.error)}
          className={`${INPUT} peer ${border(st)} ${st.dirty ? "pe-[82px]" : st.saved ? "pe-[46px]" : ""}`}
        />
        <span className={`pointer-events-none absolute start-3 z-[1] bg-k5-card px-1 transition-all ${floated ? "top-0 -translate-y-1/2 text-xs text-k5-ac" : "top-1/2 -translate-y-1/2 text-base text-k5-mut"}`}>
          {label}
          {required && req}
        </span>
        <InlineActions st={st} onSave={() => editor.save([unit])} onUndo={() => editor.undo(unit)} />
      </span>
      {showError && <ErrorText st={st} />}
    </label>
  );
}

export function EditSelect({ editor, k, label, required, options, loading }) {
  const unit = editor.unitOf(k);
  const st = editor.status(unit);
  return (
    <label className={LABEL}>
      <span className="relative block min-w-0">
        <FloatingLabelSelect k5 k5Border={border(st)} label={label} required={required} value={editor.draft[k] ?? ""} onValueChange={(value) => editor.set(k, value)} options={options || []} error={st.error} disabled={Boolean(loading)} searchable={(options || []).length > 5} className="w-full" />
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
      <DatePicker
        icon={CalendarDays}
        label={label}
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

function Locked({ label, value, floating = false }) {
  const valueRef = useRef(null);
  const t = useTranslations("k5Profile");
  const [valueOverflows, setValueOverflows] = useState(false);

  useEffect(() => {
    const element = valueRef.current;
    if (!element) return undefined;

    const measure = () => setValueOverflows(element.scrollWidth > element.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    if (element.parentElement) observer.observe(element.parentElement);
    return () => observer.disconnect();
  }, [value]);

  return (
    <div className={LABEL}>
      {!floating && <span>{label}</span>}
      <span title={t("editor.schoolOnly")} className={`${floating ? "relative" : ""} flex h-[50px] items-center gap-2 rounded-[14px] border-[3px] border-k5-line bg-k5-soft px-3.5 py-2 font-k5-body text-base font-extrabold text-k5-mut`}>
        {floating && <span className="pointer-events-none absolute start-3 top-0 -translate-y-1/2 bg-k5-soft px-1 text-xs font-black text-k5-ac">{label}</span>}
        <Lock className="h-4 w-4 flex-none" aria-hidden="true" />
        {valueOverflows && value ? (
          <Tooltip>
            <TooltipTrigger delay={100} render={<span ref={valueRef} className="min-w-0 truncate text-k5-ink" />}>
              {value}
            </TooltipTrigger>
            <TooltipContent>{value}</TooltipContent>
          </Tooltip>
        ) : (
          <span ref={valueRef} className="min-w-0 truncate text-k5-ink">{value || "—"}</span>
        )}
      </span>
    </div>
  );
}



// WhatsApp mark in its brand green.
function WhatsAppIcon(props) {
  return <IoLogoWhatsapp {...props} fill="#25d366" color="#25d366" />;
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

function EditPhone({ editor, label, keys, required, emergencyKey, fieldId }) {
  const { isMiddle } = useDashboardContext();
  const t = useTranslations("k5Profile");
  const [numKey, isoKey, waKey] = keys;
  const unit = editor.unitOf(numKey);
  const st = editor.status(unit);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);
  const itiRef = useRef(null);
  const iso = editor.draft[isoKey] || "";

  // Stable callback — reads the latest editor & keys via ref so it never goes stale inside useIntlTelInput.
  const stableRef = useRef({ editor, numKey, isoKey });
  stableRef.current = { editor, numKey, isoKey };
  const handleChange = useRef((payload) => {
    const { editor: ed, numKey: nk, isoKey: ik } = stableRef.current;
    const newIso = payload.countryCode ? payload.countryCode.toLowerCase() : "";
    const newNum = (payload.contactNumber || "").replace(/\D/g, "");
    if (newIso === (ed.draft[ik] || "") && newNum === (ed.draft[nk] ?? "")) return;
    ed.setMany({ [ik]: newIso, [nk]: newNum });
  }).current;

  useIntlTelInput(inputRef, itiRef, handleChange, iso, { containerClass: "iti-profile" });

  // Sync draft back to the widget when an external change (undo, bulk load) updates the values.
  useEffect(() => {
    const input = inputRef.current;
    const iti = itiRef.current;
    if (!input || !iti) return;
    const draftNum = editor.draft[numKey] ?? "";
    const draftIso = editor.draft[isoKey] || "";
    if (input.value !== draftNum) input.value = draftNum;
    const currentIso = iti.getSelectedCountry()?.iso2?.toLowerCase() || "";
    if (draftIso && currentIso !== draftIso) iti.setSelectedCountry(draftIso);
  }, [editor.draft[numKey], editor.draft[isoKey]]);

  // Keep the flag selector's border in sync with the unit's dirty / error status.
  useEffect(() => {
    const container = inputRef.current?.closest(".iti");
    if (!container) return;
    container.dataset.status = st.error ? "error" : st.dirty || st.saved ? "dirty" : "";
  }, [st.error, st.dirty, st.saved]);

  return (
    <div className={LABEL}>
      <span className="relative block min-w-0">
        <span className="pointer-events-none absolute left-3 top-0 z-[2] -translate-y-1/2 bg-k5-card px-1 text-xs font-black text-k5-ac">{t("fields.countryCode")}</span>
        <input
          ref={inputRef}
          type="tel"
          inputMode="numeric"
          defaultValue={editor.draft[numKey] ?? ""}
          autoComplete="off"
          onInput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/\D/g, ""); }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          aria-label={label}
          aria-invalid={Boolean(st.error)}
          className={`${INPUT} ${border(st)} peer`}
        />
        <span
          className={`pointer-events-none absolute z-[1] max-w-[calc(100%-7.5rem)] truncate whitespace-nowrap bg-k5-card px-1 transition-all ${
            focused || editor.draft[numKey]
              ? "left-[6.75rem] top-0 -translate-y-1/2 text-xs text-k5-ac"
              : "left-[7.375rem] top-1/2 -translate-y-1/2 text-base text-k5-mut"
          }`}
        >
          {label}
          {required && req}
        </span>
      </span>
      <div className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 ${isMiddle ? "justify-between" : ""}`}>
        <Toggle on={editor.draft[waKey]} onChange={(v) => editor.set(waKey, v)} icon={WhatsAppIcon}>
          {t("editor.onWhatsApp")}
        </Toggle>
        {emergencyKey && (
          <Toggle on={editor.draft[emergencyKey]} onChange={(v) => editor.set(emergencyKey, v)} icon={Siren}>
            {t("marks.emergency")}
          </Toggle>
        )}
        {isMiddle && (
          <OtpControl
            inline
            otp={editor.otp}
            fieldId={fieldId}
            label={label}
            saved={!st.dirty && Boolean(editor.draft[numKey])}
            verified={editor.verified?.[fieldId]}
            whatsApp={!st.dirty && Boolean(editor.draft[waKey])}
            whatsAppVerified={editor.verified?.[`${fieldId}WhatsAppStatus`]}
          />
        )}
      </div>
      <UnitBar editor={editor} unit={unit} />
      {!isMiddle && <OtpControl
        otp={editor.otp}
        fieldId={fieldId}
        label={label}
        saved={!st.dirty && Boolean(editor.draft[numKey])}
        verified={editor.verified?.[fieldId]}
        whatsApp={!st.dirty && Boolean(editor.draft[waKey])}
        whatsAppVerified={editor.verified?.[`${fieldId}WhatsAppStatus`]}
      />}
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
  const t = useTranslations("k5Profile");
  return (
    <>
      <label className={LABEL}>
        <FloatingLabelSelect k5 k5Border={border(st)} label={t("fields.country")} required={required} value={country ?? ""} onValueChange={(v) => editor.setMany({ [countryKey]: v, [stateKey]: "", [cityKey]: "" })} options={countries} error={st.error} disabled={!countries.length} searchable={countries.length > 5} />
      </label>
      <label className={LABEL}>
        <FloatingLabelSelect k5 k5Border={border(st)} label={t("fields.state")} required={required} value={state ?? ""} onValueChange={(v) => editor.setMany({ [stateKey]: v, [cityKey]: "" })} options={toOptions(states.data)} error={st.error} disabled={!country || states.isFetching} searchable={toOptions(states.data).length > 5} />
      </label>
      <label className={LABEL}>
        <FloatingLabelSelect k5 k5Border={border(st)} label={t("fields.city")} required={required} value={editor.draft[cityKey] ?? ""} onValueChange={(v) => editor.set(cityKey, v)} options={toOptions(cities.data)} error={st.error} disabled={!state || cities.isFetching} searchable={toOptions(cities.data).length > 5} />
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

const SMALL_BTN =
  "inline-flex min-h-10 cursor-pointer items-center justify-center gap-1.5 rounded-[12px] border-none px-3.5 font-k5-display text-[15px] font-semibold disabled:cursor-not-allowed disabled:opacity-50";
const LINK_BTN = "inline-flex cursor-pointer items-center gap-1.5 self-start border-none bg-transparent p-0 text-sm font-black text-k5-acx underline-offset-2 hover:underline";

/**
 * Hobbies (profileViewNewContent.js hobbiesContent + addOtherHobbiesContent): tick the school's hobbies, or type one
 * ("Add other hobbies", at least 3 letters, not already there). A typed hobby joins the draft ticked; unticking it
 * removes it, Undo removes all of them (cancelHobbies). Saved with the group's Save or Bulk Save.
 */
function EditableHobbies({ editor }) {
  const [adding, setAdding] = useState(false);
  const [value, setValue] = useState("");
  const t = useTranslations("k5Profile");
  const tc = useTranslations("common");
  const chosen = editor.draft.hobbies ? editor.draft.hobbies.split(",").filter(Boolean) : [];
  const known = editor.hobbies.map((h) => h.label);
  const typed = chosen.filter((label) => !known.includes(label));
  const setChosen = (list) => editor.set("hobbies", [...new Set(list)].sort().join(","));
  const toggle = (label) => setChosen(chosen.includes(label) ? chosen.filter((x) => x !== label) : [...chosen, label]);
  const add = () => {
    const label = value.replace(/,/g, " ").replace(/\s+/g, " ").trim();
    if (label.length <= 2) return toast.error(t("editor.hobbyTooShort"));
    if ([...known, ...typed].some((x) => x.toLowerCase() === label.toLowerCase())) return toast.error(t("editor.alreadyAdded"));
    setChosen([...chosen, label.slice(0, 100)]);
    setValue("");
    setAdding(false);
  };
  return (
    <>
      <h3 className={H3}>{t("page.hobbies")}</h3>
      <div className="flex flex-wrap gap-2.5">
        {[...known, ...typed].map((label) => (
          <ChipToggle key={label} on={chosen.includes(label)} onClick={() => toggle(label)}>
            {label}
          </ChipToggle>
        ))}
      </div>
      {adding ? (
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") add();
              if (e.key === "Escape") setAdding(false);
            }}
            aria-label={t("editor.otherHobby")}
            placeholder={t("editor.typeHobby")}
            autoFocus
            maxLength={100}
            className={`${INPUT} border-k5-line !w-auto min-w-[220px] flex-1`}
          />
          <button type="button" onClick={add} className={`${SMALL_BTN} bg-k5-ac text-white`}>
            {t("editor.add")}
          </button>
          <button type="button" onClick={() => setAdding(false)} className={`${SMALL_BTN} bg-k5-soft text-k5-ink`}>
            {tc("actions.cancel")}
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className={LINK_BTN}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t("editor.addHobbies")}
        </button>
      )}
      <UnitBar editor={editor} unit="hobbies" />
    </>
  );
}

/**
 * Social Media Links (socialMedaiLinksContent / getSocialMediaFields): the standard links in the existing order
 * (Instagram marked *), the student's own links with a remove button (inactivate-user-soc-media), and
 * "Add other social media link" (title + URL, saved at once).
 */
function EditableSocial({ editor, actions }) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const t = useTranslations("k5Profile");
  const tc = useTranslations("common");
  const add = async () => {
    const ok = await actions.addSocialLink(title, url);
    if (ok) {
      setTitle("");
      setUrl("");
      setAdding(false);
    }
  };
  const labelOf = (s) => {
    const name = s.label === "Twitter" ? "X (Twitter)" : s.label;
    return s.custom ? t("fields.socialUrl", { name }) : t("fields.socialProfileUrl", { name });
  };
  return (
    <>
      <h3 className={H3}>{t("page.socialLinks")}</h3>
      <div className={GRID2}>
        {editor.social.map((s) => (
          <div key={s.id} className="relative flex min-w-0 items-end gap-2">
            <div className="min-w-0 flex-1">
              <EditText editor={editor} k={`social.${s.id}`} label={labelOf(s)} required={s.label === "Instagram"} type="url" placeholder="https://" />
            </div>
            {s.custom && actions && (
              <button
                type="button"
                onClick={() => actions.removeSocialLink(s.userSocialMediaId)}
                disabled={Boolean(actions.busy)}
                aria-label={t("editor.removeNamed", { name: s.label })}
                title={tc("actions.remove")}
                className="mb-[7px] inline-flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-[10px] border-[3px] border-k5-ri bg-k5-rt p-0 text-k5-ri disabled:cursor-wait disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        ))}
      </div>
      {actions &&
        (adding ? (
          <div className={`${GRID3} items-end`}>
            <label className={LABEL}>
              <span>{t("editor.linkTitle")}</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} autoFocus className={`${INPUT} border-k5-line`} />
            </label>
            <label className={LABEL}>
              <span>{t("editor.url")}</span>
              <input value={url} onChange={(e) => setUrl(e.target.value)} type="url" placeholder="https://" className={`${INPUT} border-k5-line`} />
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={add} disabled={actions.busy === "social:add"} className={`${SMALL_BTN} min-h-[50px] bg-k5-ac text-white`}>
                {actions.busy === "social:add" ? t("editor.adding") : t("editor.add")}
              </button>
              <button type="button" onClick={() => setAdding(false)} className={`${SMALL_BTN} min-h-[50px] bg-k5-soft text-k5-ink`}>
                {tc("actions.cancel")}
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setAdding(true)} className={LINK_BTN}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t("editor.addSocial")}
          </button>
        ))}
    </>
  );
}

/** Section 1, editable. */
export function EditablePersonal({ m, editor, actions }) {
  const p = m.personal;
  const timezones = useProfileMaster("timezones");
  const countries = (editor.countries || []).map((c) => ({ value: c.key, label: c.value }));
  const t = useTranslations("k5Profile");
  const genders = GENDERS.map((g) => ({ ...g, label: t(`genders.${g.value.toLowerCase()}`) }));
  return (
    <>
      <div className={GRID3}>
        <EditText editor={editor} k="firstName" label={t("fields.firstName")} required name />
        <EditText editor={editor} k="middleName" label={t("fields.middleName")} name />
        <EditText editor={editor} k="lastName" label={t("fields.lastName")} required name />
        <EditSelect editor={editor} k="gender" label={t("fields.gender")} required options={genders} />
        <Locked label={t("fields.dob")} value={p.dob} floating />
        <EditPhone editor={editor} label={t("fields.phone")} keys={["phone", "phoneIso", "phoneWa"]} required fieldId="phoneNumber" />
        <EditPhone editor={editor} label={t("fields.altPhone")} keys={["altPhone", "altPhoneIso", "altPhoneWa"]} fieldId="altPhoneNumber" />
        <div className="flex min-w-0 flex-col gap-1.5">
          <Locked label={t("fields.email")} value={p.email} floating />
          <OtpControl otp={editor.otp} fieldId="studentEmailId" label={t("fields.email")} saved={Boolean(p.email)} verified={editor.verified?.studentEmailId} />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <EditText editor={editor} k="altEmail" label={t("fields.altEmail")} type="email" />
          <OtpControl
            otp={editor.otp}
            fieldId="altEmailId"
            label={t("fields.altEmail")}
            saved={!editor.status(editor.unitOf("altEmail")).dirty && Boolean(editor.draft.altEmail)}
            verified={editor.verified?.altEmailId}
          />
        </div>
        <EditPlace editor={editor} keys={["country", "state", "city"]} required />
        <EditSelect
          editor={editor}
          k="timezone"
          label={t("fields.timezone")}
          required
          loading={timezones.isFetching}
          options={(timezones.data || []).map((t) => ({ value: t.key, label: t.value }))}
        />
        <EditSelect editor={editor} k="nationality" label={t("fields.nationality")} required options={countries} loading={!countries.length} />
      </div>
      <EditText editor={editor} k="address" label={t("fields.address")} required />
      {HR}
      <EditableHobbies editor={editor} />
      {HR}
      <EditableSocial editor={editor} actions={actions} />
    </>
  );
}

// The parents' names are shown, not edited: the existing page disables them for a student.
function EditableParent({ editor, kind, title, email }) {
  const k = (f) => `${kind}.${f}`;
  const t = useTranslations("k5Profile");
  return (
    <>
      <h3 className={H3}>{title}</h3>
      <div className={GRID3}>
        <Locked label={t("fields.firstName")} value={editor.draft[k("first")]} floating />
        <Locked label={t("fields.middleName")} value={editor.draft[k("middle")]} floating />
        <Locked label={t("fields.lastName")} value={editor.draft[k("last")]} floating />
        <EditPhone editor={editor} label={t("fields.phoneNumber")} required keys={[k("phone"), k("phoneIso"), k("wa")]} emergencyKey={k("emergency")} fieldId={`${kind}PhoneNumber`} />
        <div className="flex min-w-0 flex-col gap-1.5">
          <Locked label={t("fields.email")} value={email} floating />
          <OtpControl otp={editor.otp} fieldId={`${kind}Email`} label={t("editor.parentEmail", { title })} saved={Boolean(email)} verified={editor.verified?.[`${kind}Email`]} />
        </div>
        <EditText editor={editor} k={k("facebook")} label={t("fields.facebook")} />
        <EditPlace editor={editor} keys={[k("country"), k("state"), k("city")]} />
        <EditText editor={editor} k={k("occupation")} label={t("fields.occupation")} />
        <EditDate editor={editor} k={k("dob")} label={t("fields.dob")} />
      </div>
    </>
  );
}

/** Section 2, editable (e-mails and the primary relation stay with the school). */
export function EditableParents({ m, editor, actions }) {
  const g = m.parents;
  const t = useTranslations("k5Profile");
  const tr = useLabelTranslator("k5Profile.roles");
  const slotText = useCallingSlotText();
  // Draft keys of the communication chips; their labels are k5Profile.channels.*.
  const channels = [
    ["commWa", "whatsapp"],
    ["commCall", "phone"],
    ["commEmail", "email"],
  ];
  return (
    <>
      {PARENTS.map((parent, i) => (
        <div key={parent.kind} className="flex flex-col gap-4">
          {i > 0 && HR}
          <EditableParent editor={editor} kind={parent.kind} title={t(`parents.${parent.kind}`)} email={g[parent.kind].email} />
        </div>
      ))}
      {HR}
      <div className={GRID3}>
        <Locked label={t("fields.relation")} value={tr(g.relation)} floating />
        <EditDate editor={editor} k="anniversary" label={t("fields.anniversary")} />
      </div>
      <h3 className={H3}>{t("page.communication")}</h3>
      <div className="flex flex-wrap gap-2.5">
        {channels.map(([key, label]) => (
          <ChipToggle key={key} on={editor.draft[key]} onClick={() => editor.set(key, !editor.draft[key])}>
            {t(`channels.${label}`)}
          </ChipToggle>
        ))}
      </div>
      <UnitBar editor={editor} unit="communication" />
      {HR}
      <h3 className={H3}>{t("page.preferredTiming")}</h3>
      {actions ? (
        <EditableCallingTimes m={m} actions={actions} />
      ) : g.callingTimes.length ? (
        <div className="flex flex-wrap gap-2.5">
          {g.callingTimes.map((slot) => (
            <span key={slot} className="rounded-full border-[3px] border-k5-line bg-k5-soft px-4 py-2 text-[15px] font-black">
              {slotText(slot)}
            </span>
          ))}
        </div>
      ) : (
        <p className="m-0 text-base font-extrabold text-k5-mut">{t("page.noTiming")}</p>
      )}
    </>
  );
}

/** Timezone / nationality warning before saving (the existing page's showWarningMessageShow). */
export function ConfirmDialog({ confirm }) {
  const okRef = useRef(null);
  const t = useTranslations("k5Profile");
  const tc = useTranslations("common");
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
          {t("editor.areYouSure")}
        </h2>
        <p id="k5-pf-confirm-d" className="m-0 text-base font-extrabold leading-[1.45]">
          {confirm.message}
        </p>
        <div className="flex flex-wrap justify-end gap-2.5">
          <button type="button" onClick={confirm.cancel} className="min-h-12 cursor-pointer rounded-full border-[3px] border-k5-line bg-k5-card px-5 font-k5-display text-[17px] font-semibold text-k5-ink">
            {tc("actions.cancel")}
          </button>
          <button
            ref={okRef}
            type="button"
            onClick={confirm.accept}
            className="min-h-12 cursor-pointer rounded-full border-[3px] border-k5-ac bg-k5-ac px-5 font-k5-display text-[17px] font-semibold text-white shadow-[0_4px_0_var(--k5-acd)]"
          >
            {confirm.okLabel || t("editor.yesSave")}
          </button>
        </div>
      </div>
    </div>
  );
}
