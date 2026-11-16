/**
 * Contact check: the whole flow of the popup, with no React and no imports, so it runs the same in the
 * browser and under `node --test` (scripts/verifyContactCheckFlow.mjs).
 *
 * The backend (is-rest-api, ContactCheckController) finds contacts that fail (email hard bounce, invalid mobile
 * number, WhatsApp not reachable). The student sees one problem at a time, in the order EMAIL, MOBILE, WHATSAPP:
 *   choose (what to do) -> code (new value + 6-digit code on that channel) | nowhatsapp (confirm) -> done -> next.
 *
 * createContactCheckFlow({ api }) is the one door: the views read getState() and call its methods; nothing else
 * decides what is shown. `api` is { pending, sendCode, verify, noWhatsapp, later }, each resolving to
 *   { ok: true, data } | { ok: false, refused, message, data }   (services/contactCheckApi.js)
 * refused: the server said no (status "0") - its message is shown as it is; otherwise it is an error.
 */

export const CONTACT_CHECK_ORDER = ["EMAIL", "MOBILE", "WHATSAPP"];
export const RESEND_SECONDS = 30;
export const LOAD_TIMEOUT_MS = 8000; // "pending": the dashboard never waits longer than this
export const FALLBACK_TIMEZONE = "Asia/Singapore";

const ERROR_MESSAGE = "This could not be done just now. Please try again in a minute.";
const UNREACHABLE_MESSAGE = "The school server could not be reached. Check your connection and try again.";

/** The problems to show, in channel order. Nothing when the check is off or the answer is not usable. */
export function problemsOf(data) {
  if (!data || !data.enabled || !Array.isArray(data.items)) return [];
  return data.items
    .filter((item) => item && item.id !== undefined && item.id !== null && CONTACT_CHECK_ORDER.includes(item.channel))
    .map((item) => ({ ...item, mandatory: item.mandatory === true, laterLeft: Number(item.laterLeft) || 0 }))
    .sort((a, b) => CONTACT_CHECK_ORDER.indexOf(a.channel) - CONTACT_CHECK_ORDER.indexOf(b.channel));
}

/** What the student can choose for a problem. "Add another email" only when the server allows it. */
export function actionsFor(item) {
  if (!item) return [];
  if (item.channel === "EMAIL") return item.canAddAlternate ? ["CHANGE", "CONFIRM", "ALTERNATE"] : ["CHANGE", "CONFIRM"];
  if (item.channel === "MOBILE") return ["CHANGE", "CONFIRM"];
  return ["CHANGE", "CONFIRM", "NO_WHATSAPP"];
}

/** A number as people read it: "+65 81234567" when the ISD code is known. */
export function displayValue(item) {
  const value = item && item.value ? String(item.value) : "";
  if (item && item.channel !== "EMAIL" && item.isdCode && value.charAt(0) !== "+") {
    return `+${String(item.isdCode).replace(/^\+/, "")} ${value}`;
  }
  return value;
}

/** A time in the student's own time zone; Asia/Singapore when that is missing, blank or not valid. */
export function formatWhen(value, timezone) {
  if (value === null || value === undefined || value === "") return "";
  const text = String(value);
  let date;
  if (typeof value === "number" || /^\d+$/.test(text)) date = new Date(Number(value));
  else if (/^\d{4}-\d{2}-\d{2}[T ]/.test(text)) date = new Date(text.replace(" ", "T"));
  else return text;
  if (Number.isNaN(date.getTime())) return text;
  const options = { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" };
  const zone = String(timezone || "").trim() || FALLBACK_TIMEZONE;
  try {
    return new Intl.DateTimeFormat("en-GB", { ...options, timeZone: zone }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-GB", { ...options, timeZone: FALLBACK_TIMEZONE }).format(date);
  }
}

// The ISD code goes back in the form the server gave it ("+91" or "91").
function isdOut(item, digits) {
  const given = item.isdCode === null || item.isdCode === undefined ? "" : String(item.isdCode);
  return given && given.charAt(0) !== "+" ? digits : `+${digits}`;
}

/**
 * What the code will be sent to: { target: { value, isdCode } }, or { error: { field: "value" | "isd", code } }
 * when it is not usable yet (the words for each code are in components/contact-check/contactCheckCopy.js).
 */
export function validateTarget(item, action, input = {}) {
  if (action === "CONFIRM") return { target: { value: item.value, isdCode: item.isdCode === undefined ? null : item.isdCode } };
  const raw = String(input.value || "").trim();
  if (item.channel === "EMAIL") {
    if (!raw) return { error: { field: "value", code: "EMAIL_EMPTY" } };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(raw)) return { error: { field: "value", code: "EMAIL_FORMAT" } };
    if (raw.toLowerCase() === String(item.value || "").toLowerCase()) {
      return { error: { field: "value", code: action === "ALTERNATE" ? "EMAIL_SAME_ALTERNATE" : "EMAIL_SAME" } };
    }
    return { target: { value: raw, isdCode: null } };
  }
  const isd = String(input.isd || "").replace(/\D/g, "");
  const number = raw.replace(/[\s\-().]/g, "");
  if (!isd) return { error: { field: "isd", code: "ISD_EMPTY" } };
  if (!number) return { error: { field: "value", code: "NUMBER_EMPTY" } };
  if (!/^\d{6,15}$/.test(number)) return { error: { field: "value", code: "NUMBER_FORMAT" } };
  return { target: { value: number, isdCode: isdOut(item, isd) } };
}

export const sameTarget = (a, b) => Boolean(a && b) && a.value === b.value && String(a.isdCode) === String(b.isdCode);

const failure = (message) => ({ ok: false, refused: false, message });

/**
 * state.phase: "idle" (not asked yet) | "loading" | "waiting" (there are problems, but the popup stands back: see
 * setHold) | "open" (the popup is shown) | "finished" (nothing to show, or the popup is over for this page load).
 * state.yielded: the contact check has had its turn or has stood back ("waiting" / "finished" was reached once);
 * from then on the dashboard's next popup may appear. It never goes back to false.
 */
export function createContactCheckFlow({ api, now = () => Date.now(), setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
  let state = {
    phase: "idle",
    items: [],
    index: 0,
    step: "", // "choose" | "code" | "nowhatsapp" | "done"
    action: "",
    sent: null, // { value, isdCode, sentTo, channel } once a code has gone out
    resendAt: 0, // ms: "Send the code again" is off until then
    busy: false,
    alert: "", // a message for the whole step (a server refusal is shown as it is)
    done: null, // { channel, action, shown, alsoMobile }
    changed: false,
    // true: opened by hand from the profile card (legacy openContactCheckPopup manual): one problem, no "Later" and
    // no "Close for now", a plain Close instead, and nothing is spent or asked again.
    manual: false,
    farewell: "", // a refusal met while leaving the last problem: the page shows it after the popup has closed
    hold: { live: false, popup: false }, // see setHold
    yielded: false,
    appInstalled: false,
  };
  const listeners = new Set();
  const set = (patch) => {
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener());
  };
  const item = () => state.items[state.index] || null;
  const active = (expected) => state.phase === "open" && item() === expected;
  const patchItem = (target, patch) => state.items.map((it) => (it === target ? { ...it, ...patch } : it));

  // Every call ends as { ok, ... }: a thrown error or an empty answer is an error, never an exception here.
  async function call(name, request) {
    try {
      const result = await api[name](request);
      if (!result || typeof result !== "object") return failure(ERROR_MESSAGE);
      if (result.ok) return { ok: true, data: result.data || {} };
      return { ok: false, refused: result.refused === true, message: result.message || ERROR_MESSAGE, data: result.data || {} };
    } catch {
      return failure(UNREACHABLE_MESSAGE);
    }
  }

  function showItem(index, extra = {}) {
    set({ phase: "open", index, step: "choose", action: actionsFor(state.items[index])[0] || "", sent: null, resendAt: 0, busy: false, alert: "", done: null, ...extra });
  }

  function finish(extra = {}) {
    set({ phase: "finished", yielded: true, step: "", busy: false, alert: "", sent: null, ...extra });
  }

  // The popup stands back (it is not shown, or it is taken away): nothing is sent, so no "Later" is spent.
  // The problems are kept, and the one that was open is asked again from its first step when the hold ends.
  function standBack() {
    set({ phase: "waiting", yielded: true, step: "", action: "", busy: false, alert: "", sent: null, resendAt: 0, done: null });
  }

  const held = () => state.hold.live || state.hold.popup;

  // The next problem, or the end of the popup. `notice`: why the last one was left (shown on the next one).
  function advance(notice = "") {
    if (state.index + 1 < state.items.length) showItem(state.index + 1, { alert: notice });
    else finish({ farewell: notice });
  }

  // A mandatory problem whose code cannot be sent or checked just now: "Close for now" is offered from here on.
  function allowCloseNow(target) {
    if (!target.mandatory) return {};
    return { items: patchItem(target, { closeNow: true }) };
  }

  let loading = null;

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    current: item,

    /** The one "pending" call of this page load. Failed, timed out, switched off or empty: nothing is shown. */
    load() {
      if (loading) return loading;
      set({ phase: "loading" });
      loading = (async () => {
        let timer;
        const timeout = new Promise((resolve) => {
          timer = setTimer(() => resolve(failure(UNREACHABLE_MESSAGE)), LOAD_TIMEOUT_MS);
        });
        const result = await Promise.race([call("pending"), timeout]);
        clearTimer(timer);
        if (state.phase !== "loading") return;
        const items = result.ok ? problemsOf(result.data) : [];
        if (!items.length) {
          finish();
          return;
        }
        state = { ...state, items, appInstalled: result.data.appInstalled === true };
        if (held()) standBack();
        else showItem(0);
      })();
      return loading;
    },

    /**
     * What else is going on in the dashboard: { live } a live class is running (or it is not known yet whether one
     * is), { popup } another blocking popup is open. While either is true the contact check does not open; it opens
     * later in the same page load, once both are false. A live class also takes away a popup that is already open
     * (a class must never be blocked); another popup cannot open over this one, so `popup` only delays the opening.
     */
    setHold(patch = {}) {
      const hold = { ...state.hold, ...patch };
      hold.live = hold.live === true;
      hold.popup = hold.popup === true;
      if (hold.live === state.hold.live && hold.popup === state.hold.popup) return;
      state = { ...state, hold };
      if (state.phase === "open" && hold.live) {
        // A step that is already saved ("done") is not asked again: the next problem waits instead.
        if (state.step === "done") {
          if (state.index + 1 < state.items.length) {
            state = { ...state, index: state.index + 1 };
            standBack();
          } else finish();
        } else standBack();
      } else if (state.phase === "waiting" && !held()) showItem(state.index);
      else set({});
    },

    /**
     * The profile card's "Fix now": opens this one problem straight away (no dashboard sequencing). Closed by
     * closeManual() or by finishing the steps; "later" is never called for it.
     */
    openManual(target) {
      if (!target || state.phase === "open") return;
      const problem = { ...target, mandatory: target.mandatory === true, laterLeft: Number(target.laterLeft) || 0 };
      state = { ...state, items: [problem], manual: true, changed: false };
      showItem(0);
    },

    /** Manual mode's Close button / X: leaves the popup unless a call is running. */
    closeManual() {
      if (!state.manual || state.phase !== "open" || state.busy) return;
      finish();
    },

    /** Step 1: which option is selected. */
    choose(action) {
      if (state.phase !== "open" || state.busy || state.step !== "choose") return;
      if (!actionsFor(item()).includes(action)) return;
      set({ action, alert: "" });
    },

    /** Step 1 -> step 2 (or the WhatsApp confirmation). */
    proceed() {
      if (state.phase !== "open" || state.busy || state.step !== "choose") return;
      if (!actionsFor(item()).includes(state.action)) {
        set({ alert: "Choose one of the options to continue." });
        return;
      }
      set({ step: state.action === "NO_WHATSAPP" ? "nowhatsapp" : "code", sent: null, resendAt: 0, alert: "" });
    },

    back() {
      if (state.phase !== "open" || state.busy || (state.step !== "code" && state.step !== "nowhatsapp")) return;
      set({ step: "choose", sent: null, resendAt: 0, alert: "" });
    },

    /** The value was changed after a code went out: that code is for the old value, so a new one is needed. */
    valueEdited(input) {
      if (state.phase !== "open" || state.step !== "code" || !state.sent || state.action === "CONFIRM") return;
      const { target } = validateTarget(item(), state.action, input);
      if (sameTarget(target, state.sent)) return;
      set({ sent: null });
    },

    /** Sends (or sends again) the code. Returns { error } when the typed value is not usable yet. */
    async sendCode(input) {
      if (state.phase !== "open" || state.busy || state.step !== "code") return {};
      const target = item();
      const checked = validateTarget(target, state.action, input);
      if (checked.error) return { error: checked.error };
      const wait = Math.ceil((state.resendAt - now()) / 1000);
      if (sameTarget(checked.target, state.sent) && wait > 0) {
        set({ alert: `You can ask for a new code in ${wait} second${wait === 1 ? "" : "s"}.` });
        return {};
      }
      set({ busy: true, alert: "" });
      const result = await call("sendCode", { reviewId: target.id, action: state.action, value: checked.target.value, isdCode: checked.target.isdCode });
      if (!active(target)) return {};
      if (!result.ok) {
        // Refused (the "too many codes" limit included) or failed: a mandatory problem must not block the dashboard.
        set({ busy: false, alert: result.message, ...allowCloseNow(target) });
        return {};
      }
      set({
        busy: false,
        sent: { ...checked.target, sentTo: result.data.sentTo || displayValue({ ...checked.target, channel: target.channel }), channel: result.data.channel || target.channel },
        resendAt: now() + RESEND_SECONDS * 1000,
      });
      return { sent: true };
    },

    /** Checks the code. Returns { error: code } when the code is not six digits yet. */
    async verify(code, alsoMobile = false) {
      if (state.phase !== "open" || state.busy || state.step !== "code") return {};
      if (!state.sent) {
        set({ alert: "Send the code first, then enter it here." });
        return {};
      }
      const digits = String(code || "").trim();
      if (!/^\d{6}$/.test(digits)) return { error: digits ? "CODE_FORMAT" : "CODE_EMPTY" };
      const target = item();
      const { action, sent } = state;
      const also = target.channel === "WHATSAPP" && action === "CHANGE" && alsoMobile === true;
      set({ busy: true, alert: "" });
      const result = await call("verify", { reviewId: target.id, action, value: sent.value, isdCode: sent.isdCode, code: digits, alsoMobile: also });
      if (!active(target)) return {};
      if (!result.ok) {
        // A wrong code is a refusal: the student tries again. An error (server, no answer) is not their doing,
        // so a mandatory problem does not hold them here.
        set({ busy: false, alert: result.message, ...(result.refused ? {} : allowCloseNow(target)) });
        return { failed: true };
      }
      set({
        busy: false,
        step: "done",
        changed: true,
        resendAt: 0,
        done: { channel: target.channel, action, shown: displayValue({ channel: target.channel, value: sent.value, isdCode: sent.isdCode }), alsoMobile: also },
      });
      return { verified: true };
    },

    /** "I don't use WhatsApp", after the student has confirmed it. */
    async noWhatsapp() {
      if (state.phase !== "open" || state.busy || state.step !== "nowhatsapp") return;
      const target = item();
      set({ busy: true, alert: "" });
      const result = await call("noWhatsapp", { reviewId: target.id });
      if (!active(target)) return;
      if (!result.ok) {
        set({ busy: false, alert: result.message });
        return;
      }
      set({ busy: false, step: "done", changed: true, done: { channel: "WHATSAPP", action: "NO_WHATSAPP", shown: displayValue(target), alsoMobile: false } });
    },

    /** "Later": spends one skip. Not offered (and not sent) for a mandatory problem. */
    async later() {
      if (state.phase !== "open" || state.busy || state.step !== "choose") return;
      const target = item();
      if (target.mandatory || state.manual) return;
      set({ busy: true, alert: "" });
      const result = await call("later", { reviewId: target.id });
      if (!active(target)) return;
      if (result.ok) {
        advance();
        return;
      }
      if (result.refused && result.data.mandatory === true) {
        // The skips are used up: say so and keep it open (only this refusal makes the problem mandatory).
        set({ busy: false, items: patchItem(target, { mandatory: true, laterLeft: 0 }), alert: result.message });
        return;
      }
      if (result.refused) {
        // Any other refusal (already answered, switched off...): say why and leave this problem.
        advance(result.message);
        return;
      }
      // The server could not be reached: the student is not held here, the popup comes back next time.
      finish();
    },

    /** After "done": the next problem, or the end. */
    next() {
      if (state.phase !== "open" || state.busy || state.step !== "done") return;
      advance();
    },

    /** Esc / a click outside: never skips or closes a problem; on the last step it moves on like its button. */
    dismiss() {
      if (state.phase === "open" && !state.busy && state.step === "done") advance();
    },

    /** The sign-in ended while the popup was open: it steps aside for the "signed out" dialog. */
    abandon() {
      if (state.phase !== "finished") finish();
    },

    /** "Close for now": this page load only. "later" is not called, so no skip is spent and it is asked again. */
    closeForNow() {
      const target = item();
      if (state.phase !== "open" || state.busy || state.manual || !target || !target.mandatory || !target.closeNow) return;
      finish();
    },
  };
}
