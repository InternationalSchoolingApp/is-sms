"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AlertCircle, AlertTriangle, Ban, Check, CheckCircle2, Info, Mail, MessageCircle, Pencil, Plus, Smartphone, UserRound } from "lucide-react";
import countries from "intl-tel-input/data";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useStudentDashboardData } from "@/hooks/useStudentDashboardData";
import { useAppearance } from "@/components/appearance/AppearanceProvider";
import { PicoMascot } from "@/components/k5/pico/PicoMascot";
import { actionsFor, displayValue, formatWhen, validateTarget } from "@/utils/contactCheckFlow";
import { contactCheckCopy } from "@/components/contact-check/contactCheckCopy";
import { k5Skin, standardSkin } from "@/components/contact-check/ContactCheckShells";

/**
 * The "Contact check" popup of the student dashboard home: one failing contact at a time (email, mobile,
 * WhatsApp) - change it, or prove it is right with a 6-digit code on the same channel.
 *
 * What is shown and what each button does is decided by the flow (utils/contactCheckFlow.js, through
 * hooks/useContactCheck.js); this file only draws the current step, once, for the three grade bands:
 *   band "elementary"  K-5 look and child-friendly words        (k5Skin + contactCheckCopy("elementary"))
 *   band "middle"      the same K-5 components in the 6-8 skin  (k5Skin + the standard words)
 *   band "high"        the standard dashboard look              (standardSkin + the standard words)
 * Loaded only when there is a problem to show (StudentHomeForGrade.jsx).
 */

const CHANNEL_ICONS = { EMAIL: Mail, MOBILE: Smartphone, WHATSAPP: MessageCircle };
const ACTION_ICONS = { CHANGE: Pencil, CONFIRM: Check, ALTERNATE: Plus, NO_WHATSAPP: Ban };

// Country codes come from the phone library the profile page already uses (intl-tel-input); the popup shows them
// in a plain <select>, because that library's own country list is attached to <body>, outside a modal dialog.
function useCountryOptions() {
  return useMemo(() => {
    let nameOf = (iso) => iso.toUpperCase();
    try {
      const names = new Intl.DisplayNames(["en"], { type: "region" });
      nameOf = (iso) => names.of(iso.toUpperCase()) || iso.toUpperCase();
    } catch {}
    return countries
      .map((c) => ({ iso: c.iso2, dial: String(c.dialCode), priority: c.priority || 0, name: nameOf(c.iso2) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, []);
}

// The country a stored ISD code stands for (the main country of a shared code such as +1).
function isoForDial(options, isdCode) {
  const digits = String(isdCode || "").replace(/\D/g, "");
  if (!digits) return "";
  const matches = options.filter((c) => c.dial === digits).sort((a, b) => a.priority - b.priority);
  return matches[0]?.iso || "";
}

/** Each step starts on its first control, so keyboard and screen-reader users land in the right place. */
function useStepFocus(ref, trigger) {
  useEffect(() => {
    const timer = setTimeout(() => ref.current?.querySelector("[data-cc-focus]")?.focus(), 0);
    return () => clearTimeout(timer);
  }, [ref, trigger]);
}

/** Seconds until "Send the code again" is allowed (0 when it is). */
function useSecondsUntil(at) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    const tick = () => setLeft(Math.max(0, Math.ceil((at - Date.now()) / 1000)));
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 500);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [at]);
  return left;
}

// The error of one field: in the page only while there is one, so aria-describedby never points at hidden text.
function FieldError({ id, message, skin }) {
  if (!message) return null;
  return (
    <p id={id} className={skin.error}>
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-none" aria-hidden="true" />
      <span>
        <span className="sr-only">Error: </span>
        {message}
      </span>
    </p>
  );
}

const describedBy = (...ids) => ids.filter(Boolean).join(" ") || undefined;

function Sentence({ parts, skin, className }) {
  const [before, value, after] = parts;
  return (
    <p className={className || skin.text}>
      {before}
      {value && <span className={skin.value}>{value}</span>}
      {after}
    </p>
  );
}

function StepAlert({ message, skin }) {
  if (!message) return null;
  return (
    <p role="alert" className={skin.alert}>
      {message}
    </p>
  );
}

function CloseForNow({ item, flow, busy, copy, skin }) {
  if (!item.mandatory || !item.closeNow) return null;
  return (
    <skin.Btn variant="quiet" onClick={flow.closeForNow} disabled={busy}>
      {copy.closeNowLabel}
    </skin.Btn>
  );
}

/* ---------- step 1: what is wrong, and what the student wants to do ---------- */

function ChooseStep({ flow, state, item, copy, skin, band, timezone }) {
  const ref = useRef(null);
  const name = useId();
  const words = copy.channels[item.channel];
  const elementary = band === "elementary";
  // Also after "Later" was refused and the problem became mandatory: the Later button is gone, focus goes back to the options.
  useStepFocus(ref, `${item.id}:${item.mandatory}`);

  const when = !elementary && item.lastFailedAt ? formatWhen(item.lastFailedAt, timezone) : "";
  const skipNote = item.mandatory ? copy.mandatory : item.laterLeft > 0 ? copy.skip(item.laterLeft) : "";

  return (
    <form
      ref={ref}
      noValidate
      aria-busy={state.busy}
      className="flex min-h-0 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        flow.proceed();
      }}
    >
      <div className={skin.body}>
        <StepAlert message={state.alert} skin={skin} />
        <div className={skin.notice}>
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-none" aria-hidden="true" />
          {words.headline ? <span>{words.headline}</span> : <Sentence parts={words.problem(displayValue(item))} skin={skin} className="m-0" />}
        </div>
        {words.headline && <Sentence parts={words.problem(displayValue(item))} skin={skin} />}
        {(item.reason || when || item.about) && (
          <p className={skin.reason}>
            {item.reason && (
              <>
                <strong>{copy.reasonLabel}</strong> {item.reason}
              </>
            )}
            {item.about && <> About: {item.about}.</>}
            {when && <> Last tried {when}.</>}
          </p>
        )}
        <fieldset className="m-0 min-w-0 border-none p-0">
          <legend className={skin.legend}>{copy.legend}</legend>
          <div className="flex flex-col gap-2.5">
            {actionsFor(item).map((action) => {
              const Icon = ACTION_ICONS[action];
              const [title, text] = words.options[action];
              const checked = state.action === action;
              return (
                <label key={action} className={skin.option}>
                  <input type="radio" name={name} value={action} checked={checked} onChange={() => flow.choose(action)} data-cc-focus={checked ? "" : undefined} className="peer sr-only" />
                  <span className={skin.optionIcon} aria-hidden="true">
                    <Icon className="h-5 w-5" strokeWidth={2.6} />
                  </span>
                  <span className="min-w-0">
                    <span className={skin.optionTitle}>{title}</span>
                    <span className={skin.optionText}>{text}</span>
                  </span>
                  <span className={skin.optionMark} aria-hidden="true">
                    <Check className="h-3.5 w-3.5" strokeWidth={3.4} />
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
        {words.codeHint && <p className={skin.muted}>{words.codeHint}</p>}
        {!elementary && item.channel === "EMAIL" && <p className={skin.muted}>{copy.signInShort}</p>}
        {copy.help.choose && (
          <p className={skin.help}>
            <UserRound className="h-4 w-4 flex-none" aria-hidden="true" />
            {copy.help.choose}
          </p>
        )}
      </div>
      <div className={skin.footer}>
        {skipNote && <span className={skin.footNote}>{skipNote}</span>}
        {!item.mandatory && (
          <skin.Btn variant="quiet" onClick={flow.later} disabled={state.busy}>
            {copy.laterLabel}
          </skin.Btn>
        )}
        <CloseForNow item={item} flow={flow} busy={state.busy} copy={copy} skin={skin} />
        <skin.Btn type="submit" disabled={state.busy}>
          {copy.continueLabel}
        </skin.Btn>
      </div>
    </form>
  );
}

/* ---------- step 2: the new value (or the stored one), then the code ---------- */

function CodeStep({ flow, state, item, copy, skin }) {
  const ref = useRef(null);
  const ids = useId();
  const id = (part) => `${ids}-${part}`;
  const words = copy.channels[item.channel];
  // Only the buttons are switched off while a request runs: a field that is disabled while focused loses the focus.
  const { action, sent, busy } = state;
  const isEmail = item.channel === "EMAIL";
  const typed = action !== "CONFIRM";
  const countryOptions = useCountryOptions();

  const [value, setValue] = useState("");
  const [iso, setIso] = useState(() => isoForDial(countryOptions, item.isdCode));
  const [code, setCode] = useState("");
  const [alsoMobile, setAlsoMobile] = useState(false);
  const [errors, setErrors] = useState({}); // { value, isd, code }: shown after the field is left or the form is sent
  const wait = useSecondsUntil(state.resendAt);

  // First the value (or the Send button); once a code has gone out, the code box.
  useStepFocus(ref, sent);

  const dialOf = (code2) => countryOptions.find((c) => c.iso === code2)?.dial || "";
  const inputOf = (nextValue = value, nextIso = iso) => ({ value: nextValue, isd: dialOf(nextIso) });

  // Shows (or clears) the message of the value / country-code fields for what is typed now.
  function checkTarget(input) {
    const { error } = validateTarget(item, action, input);
    setErrors((old) => ({ ...old, value: error?.field === "value" ? copy.errors[error.code] : "", isd: error?.field === "isd" ? copy.errors[error.code] : "" }));
    return error;
  }

  function onValueChange(next) {
    const cleaned = isEmail ? next : next.replace(/[^\d\s\-().]/g, "");
    setValue(cleaned);
    // A message goes as soon as the value is right; it never appears while the student is still typing.
    if (errors.value) checkTarget(inputOf(cleaned));
    flow.valueEdited(inputOf(cleaned));
  }

  function onIsoChange(next) {
    setIso(next);
    if (errors.isd || errors.value) checkTarget(inputOf(value, next));
    flow.valueEdited(inputOf(value, next));
  }

  // WebOTP: where the browser can read the SMS itself, the code is filled in and checked for the student.
  const otpRef = useRef(null);
  const verifyRef = useRef(null);
  const stopOtp = () => {
    otpRef.current?.abort();
    otpRef.current = null;
  };
  useEffect(() => {
    const bySms = sent && (sent.channel === "MOBILE" || sent.channel === "SMS");
    if (!bySms || typeof window === "undefined" || !("OTPCredential" in window) || !navigator.credentials) return undefined;
    const controller = new AbortController();
    otpRef.current = controller;
    navigator.credentials
      .get({ otp: { transport: ["sms"] }, signal: controller.signal })
      .then((otp) => {
        if (!otp?.code || controller.signal.aborted) return;
        const digits = String(otp.code).replace(/\D/g, "").slice(0, 6);
        setCode(digits);
        verifyRef.current?.(digits);
      })
      .catch(() => {
        // Stopped (verify, resend, back, close) or not allowed: the student types the code.
      });
    return () => controller.abort();
  }, [sent]);

  async function send() {
    stopOtp();
    const result = await flow.sendCode(inputOf());
    if (result.error) {
      checkTarget(inputOf());
      ref.current?.querySelector(result.error.field === "isd" ? "[data-cc-isd]" : "[data-cc-value]")?.focus();
      return;
    }
    if (result.sent) {
      setCode("");
      setErrors((old) => ({ ...old, code: "" }));
    }
  }

  async function verify(digits = code) {
    stopOtp();
    const result = await flow.verify(digits, alsoMobile);
    const box = ref.current?.querySelector("[data-cc-code]");
    if (result.error) {
      setErrors((old) => ({ ...old, code: copy.errors[result.error] }));
      box?.focus();
    } else if (result.failed) {
      box?.focus();
      box?.select();
    }
  }
  useEffect(() => {
    verifyRef.current = verify;
  });

  const valueLabel = words.valueLabel[action];
  const sendButton = (
    <skin.Btn variant="send" onClick={send} disabled={busy || (Boolean(sent) && wait > 0)} data-cc-focus={!typed && !sent ? "" : undefined}>
      {words.sendLabel}
    </skin.Btn>
  );

  return (
    <form
      ref={ref}
      noValidate
      autoComplete="off"
      aria-busy={busy}
      className="flex min-h-0 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        // Enter in the value field asks for the code; once it is out, Enter checks it.
        if (sent) verify();
        else send();
      }}
    >
      <div className={skin.body}>
        <p className={skin.step}>{copy.stepLabel}</p>
        <StepAlert message={state.alert} skin={skin} />

        {!typed && (
          <>
            <Sentence parts={copy.confirmLead(item.channel, displayValue(item))} skin={skin} />
            <div>{sendButton}</div>
          </>
        )}

        {typed && isEmail && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={id("value")} className={skin.label}>
              {valueLabel}
            </label>
            {action === "ALTERNATE" && (
              <p id={id("value-hint")} className={skin.muted}>
                {copy.alternateHint}
              </p>
            )}
            <div className="flex items-center gap-2">
              <skin.Field
                id={id("value")}
                type="email"
                inputMode="email"
                autoComplete="email"
                maxLength={150}
                required
                placeholder="name@example.com"
                value={value}
                onChange={(e) => onValueChange(e.target.value)}
                onBlur={() => value && checkTarget(inputOf())}
                aria-invalid={errors.value ? "true" : "false"}
                aria-describedby={describedBy(action === "ALTERNATE" && id("value-hint"), errors.value && id("value-error"))}
                data-cc-value=""
                data-cc-focus={!sent ? "" : undefined}
              />
              {sendButton}
            </div>
            <FieldError id={id("value-error")} message={errors.value} skin={skin} />
          </div>
        )}

        {typed && !isEmail && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={id("value")} className={skin.label}>
              {valueLabel}
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <skin.Select
                aria-label="Country code"
                autoComplete="tel-country-code"
                value={iso}
                onChange={(e) => onIsoChange(e.target.value)}
                aria-invalid={errors.isd ? "true" : "false"}
                aria-describedby={describedBy(errors.isd && id("isd-error"))}
                data-cc-isd=""
              >
                {!iso && <option value="">Country code</option>}
                {countryOptions.map((c) => (
                  <option key={c.iso} value={c.iso}>
                    +{c.dial} {c.name}
                  </option>
                ))}
              </skin.Select>
              <skin.Field
                id={id("value")}
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                maxLength={20}
                required
                placeholder="Number without the country code"
                value={value}
                onChange={(e) => onValueChange(e.target.value)}
                onBlur={() => value && checkTarget(inputOf())}
                aria-invalid={errors.value ? "true" : "false"}
                aria-describedby={describedBy(errors.value && id("value-error"))}
                className="flex-1 basis-40"
                data-cc-value=""
                data-cc-focus={!sent ? "" : undefined}
              />
              {sendButton}
            </div>
            <FieldError id={id("isd-error")} message={errors.isd} skin={skin} />
            <FieldError id={id("value-error")} message={errors.value} skin={skin} />
          </div>
        )}

        {item.channel === "WHATSAPP" && action === "CHANGE" && (
          <skin.Check id={id("also")} checked={alsoMobile} onChange={setAlsoMobile}>
            {copy.alsoMobile}
          </skin.Check>
        )}

        <p role="status" className={sent ? skin.sent : "sr-only"}>
          {sent && (
            <>
              <Check className="h-4 w-4 flex-none" strokeWidth={3} aria-hidden="true" />
              {copy.sent(sent.channel, sent.sentTo)}
            </>
          )}
        </p>

        {sent && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={id("code")} className={skin.label}>
              {words.codeLabel}
            </label>
            <skin.Field
              code
              id={id("code")}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              placeholder={copy.codePlaceholder}
              value={code}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
                setCode(digits);
                if (errors.code && digits.length === 6) setErrors((old) => ({ ...old, code: "" }));
              }}
              aria-invalid={errors.code ? "true" : "false"}
              aria-describedby={describedBy(errors.code && id("code-error"))}
              data-cc-code=""
              data-cc-focus=""
            />
            <FieldError id={id("code-error")} message={errors.code} skin={skin} />
            <p className={`${skin.muted} flex flex-wrap items-center gap-1.5`}>
              {copy.resendLead}
              <skin.Btn variant="link" onClick={send} disabled={busy || wait > 0}>
                {copy.resendLabel}
              </skin.Btn>
              {wait > 0 && <span aria-hidden="true">(in {wait}s)</span>}
            </p>
          </div>
        )}

        {isEmail && (
          <p className={skin.info}>
            <Info className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
            {copy.signIn}
          </p>
        )}
        {copy.help.code && (
          <p className={skin.help}>
            <UserRound className="h-4 w-4 flex-none" aria-hidden="true" />
            {copy.help.code}
          </p>
        )}
      </div>
      <div className={skin.footer}>
        <skin.Btn variant="quiet" onClick={flow.back} disabled={busy}>
          {copy.backLabel}
        </skin.Btn>
        <CloseForNow item={item} flow={flow} busy={busy} copy={copy} skin={skin} />
        <skin.Btn type="submit" variant="success" disabled={busy || !sent}>
          <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
          {copy.verifyLabel}
        </skin.Btn>
      </div>
    </form>
  );
}

/* ---------- "I don't use WhatsApp": asks before it is saved ---------- */

function NoWhatsappStep({ flow, state, item, copy, skin }) {
  const ref = useRef(null);
  useStepFocus(ref, item.id);
  return (
    <form
      ref={ref}
      aria-busy={state.busy}
      className="flex min-h-0 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        flow.noWhatsapp();
      }}
    >
      <div className={skin.body}>
        <StepAlert message={state.alert} skin={skin} />
        <Sentence parts={copy.noWhatsapp.lead(displayValue(item))} skin={skin} />
        <p className={skin.muted}>{copy.noWhatsapp.note}</p>
      </div>
      <div className={skin.footer}>
        {/* Focus starts on the safe choice. */}
        <skin.Btn variant="quiet" onClick={flow.back} disabled={state.busy} data-cc-focus="">
          {copy.backLabel}
        </skin.Btn>
        <skin.Btn type="submit" disabled={state.busy}>
          {copy.noWhatsapp.confirmLabel}
        </skin.Btn>
      </div>
    </form>
  );
}

/* ---------- saved ---------- */

function Buddy() {
  const { preferences } = useAppearance();
  return <PicoMascot buddy={preferences?.buddy} width={64} />;
}

function DoneStep({ flow, state, copy, skin, band, firstName }) {
  const ref = useRef(null);
  const { done } = state;
  const kind = `${done.channel}:${done.action}`;
  const next = state.items[state.index + 1];
  const [before, after] = copy.done.text(kind, done.alsoMobile);
  const showValue = done.action !== "NO_WHATSAPP";
  useStepFocus(ref, kind);
  return (
    <form
      ref={ref}
      className="flex min-h-0 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        flow.next();
      }}
    >
      <div className={skin.body}>
        <div className={skin.doneBox}>
          <span className={skin.doneIcon}>
            <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
          </span>
          <h3 className={skin.doneTitle}>{copy.done.heading(kind, firstName)}</h3>
          <div className="flex items-center gap-3">
            {band === "elementary" && <Buddy />}
            <div className="flex min-w-0 flex-col gap-1.5">
              <Sentence parts={[before, showValue ? done.shown : "", after]} skin={skin} />
              {done.channel === "EMAIL" && <p className={skin.muted}>{copy.done.signIn}</p>}
            </div>
          </div>
        </div>
      </div>
      <div className={skin.footer}>
        {next && <span className={skin.footNote}>{copy.done.nextNote(next.channel)}</span>}
        <skin.Btn type="submit" data-cc-focus="">
          {next ? copy.done.nextLabel : copy.done.okLabel}
        </skin.Btn>
      </div>
    </form>
  );
}

/** check: what useContactCheck() returned; band: "elementary" | "middle" | "high". */
export default function ContactCheckModal({ check, band }) {
  const { flow, state } = check;
  const { context } = useDashboardContext();
  const dashboardData = useStudentDashboardData({ schoolUUID: context?.schoolUUID, userId: context?.userId });
  const titleId = useId();
  const item = state.items[state.index];
  if (!flow || state.phase !== "open" || !item) return null;

  const skin = band === "high" ? standardSkin : k5Skin;
  const copy = contactCheckCopy(band);
  const firstName = String(context?.userName || "").trim().split(/\s+/)[0] || "";
  const title = state.step === "nowhatsapp" ? copy.noWhatsapp.title : copy.channels[item.channel].title;
  // The header's X is only there where the step has a way out: "Later" on step 1, and the last step's own button.
  const close =
    state.step === "choose" && !item.mandatory ? { onClose: flow.later, closeLabel: copy.laterLabel } : state.step === "done" ? { onClose: flow.next, closeLabel: "Close" } : {};
  const stepKey = `${item.id}:${state.step}`;
  const props = { flow, state, item, copy, skin, band };

  return (
    <skin.Shell titleId={titleId} title={title} Icon={CHANNEL_ICONS[item.channel]} onDismiss={flow.dismiss} {...close}>
      {state.step === "choose" && <ChooseStep key={stepKey} {...props} timezone={dashboardData.userTimezone} />}
      {state.step === "code" && <CodeStep key={stepKey} {...props} />}
      {state.step === "nowhatsapp" && <NoWhatsappStep key={stepKey} {...props} />}
      {state.step === "done" && <DoneStep key={stepKey} {...props} firstName={firstName} />}
    </skin.Shell>
  );
}
