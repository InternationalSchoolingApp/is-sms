/**
 * Contact check: every word the popup shows, per grade band. No imports, so it is also checked by
 * scripts/verifyContactCheckFlow.mjs.
 *   "elementary" (K-5, Playful): short, child-friendly sentences.
 *   "standard"   (6-8 Balanced and 9-12): the wording of the existing dashboard's popup.
 */

const plural = (n) => (n === 1 ? "" : "s");

const STANDARD = {
  continueLabel: "Continue",
  laterLabel: "Later",
  backLabel: "Back",
  verifyLabel: "Verify and save",
  closeNowLabel: "Close for now",
  legend: "What would you like to do?",
  reasonLabel: "Reason:",
  help: { choose: "", code: "" },
  stepLabel: "Step 2 of 2",
  resendLabel: "Resend code",
  resendLead: "Didn't get it?",
  codePlaceholder: "Enter code",
  signIn: "Your sign-in email does not change. This address is only used for school emails.",
  signInShort: "Your sign-in email does not change.",
  alsoMobile: "Also use this as my mobile number",
  mandatory: "Please fix this now to keep getting messages from the school. It can no longer be skipped.",
  skip: (n) => `You can skip this ${n} more time${plural(n)}.`,
  channels: {
    EMAIL: {
      title: "Check your email address",
      headline: "",
      problem: (value) => ["School emails to ", value, " are not being delivered."],
      options: {
        CHANGE: ["Update my email", "Replace it with an address that works"],
        CONFIRM: ["It is correct", "Keep this address — we will try again"],
        ALTERNATE: ["Add another email", "Keep this one and add a second address"],
      },
      codeHint: "",
      valueLabel: { CHANGE: "New email", ALTERNATE: "Second email" },
      sendLabel: "Send code",
      codeLabel: "Enter the 6-digit code from the email",
    },
    MOBILE: {
      title: "Check your mobile number",
      headline: "",
      problem: (value) => ["Text messages to your mobile number ", value, " are not reaching you."],
      options: {
        CHANGE: ["Change my number", "Enter the correct number. We'll text you a code."],
        CONFIRM: ["It is correct", "We'll text a code to this number to confirm it."],
      },
      codeHint: "",
      valueLabel: { CHANGE: "New mobile number" },
      sendLabel: "Send SMS code",
      codeLabel: "Enter the 6-digit code from the text message",
    },
    WHATSAPP: {
      title: "Check your WhatsApp number",
      headline: "",
      problem: (value) => ["We couldn't reach you on WhatsApp at ", value, "."],
      options: {
        CHANGE: ["Give my WhatsApp number", "Use a different number for WhatsApp. We'll send a code there."],
        CONFIRM: ["It is correct", "This number has WhatsApp. We'll send a code on WhatsApp."],
        NO_WHATSAPP: ["I don't use WhatsApp", "Stop WhatsApp messages. You'll still get email and SMS."],
      },
      codeHint: "",
      valueLabel: { CHANGE: "WhatsApp number" },
      sendLabel: "Send WhatsApp code",
      codeLabel: "Enter the 6-digit code we sent on WhatsApp",
    },
  },
  confirmLead: (channel, value) => [
    "We'll send a 6-digit code to ",
    value,
    `${channel === "WHATSAPP" ? " on WhatsApp" : channel === "MOBILE" ? " by SMS" : ""}. Enter the code here to confirm it is yours.`,
  ],
  alternateHint: "After you enter the code, school emails also go to this address. Your current one is kept.",
  sent: (channel, sentTo) => `We sent a 6-digit code ${{ EMAIL: "by email", MOBILE: "by SMS", SMS: "by SMS", WHATSAPP: "on WhatsApp" }[channel] || ""} to ${sentTo}.`,
  noWhatsapp: {
    title: "Stop WhatsApp messages?",
    lead: (value) => ["We'll stop sending WhatsApp messages to ", value, "."],
    note: "You'll still get school messages by email and SMS. You can give a WhatsApp number later from your profile.",
    confirmLabel: "Yes, stop WhatsApp messages",
  },
  done: {
    heading: (kind) =>
      ({
        "EMAIL:CHANGE": "Email updated",
        "EMAIL:CONFIRM": "Email confirmed",
        "EMAIL:ALTERNATE": "Email added",
        "MOBILE:CHANGE": "Mobile number updated",
        "MOBILE:CONFIRM": "Mobile number confirmed",
        "WHATSAPP:CHANGE": "WhatsApp number saved",
        "WHATSAPP:CONFIRM": "WhatsApp number confirmed",
        "WHATSAPP:NO_WHATSAPP": "WhatsApp messages stopped",
      })[kind] || "Done",
    text: (kind, alsoMobile) =>
      ({
        "EMAIL:CHANGE": ["School emails now go to ", "."],
        "EMAIL:CONFIRM": ["We'll send school emails to ", " again."],
        "EMAIL:ALTERNATE": ["School emails now also go to ", "."],
        "MOBILE:CHANGE": ["Text messages from the school now go to ", "."],
        "MOBILE:CONFIRM": ["We'll keep sending text messages to ", "."],
        "WHATSAPP:CHANGE": ["WhatsApp messages from the school now go to ", alsoMobile ? ". It is also your mobile number now." : "."],
        "WHATSAPP:CONFIRM": ["We'll keep sending WhatsApp messages to ", "."],
        "WHATSAPP:NO_WHATSAPP": ["The school will reach you by email and SMS instead.", ""],
      })[kind] || ["", ""],
    signIn: "Your sign-in email did not change.",
    nextNote: (channel) => ({ EMAIL: "Next: your email address.", MOBILE: "Next: your mobile number.", WHATSAPP: "Next: your WhatsApp number." })[channel] || "",
    nextLabel: "Next",
    okLabel: "OK",
  },
  errors: {
    EMAIL_EMPTY: "Enter the email address.",
    EMAIL_FORMAT: "Enter an email address in the format name@example.com.",
    EMAIL_SAME: 'This is the address that is not working. Enter a different one, or go back and choose "It is correct".',
    EMAIL_SAME_ALTERNATE: "This is your current address. Enter a different one.",
    ISD_EMPTY: "Choose the country code.",
    NUMBER_EMPTY: "Enter the number.",
    NUMBER_FORMAT: "Enter only the digits of the number, without the country code (6 to 15 digits).",
    CODE_EMPTY: "Enter the 6-digit code we sent you.",
    CODE_FORMAT: "The code has 6 digits. Check it and try again.",
  },
};

const ELEMENTARY = {
  ...STANDARD,
  continueLabel: "Next",
  legend: "What do you want to do?",
  reasonLabel: "Why?",
  help: { choose: "Not sure? Ask a parent to help.", code: "Ask a parent to help you find the code." },
  resendLabel: "Send the code again",
  resendLead: "",
  signIn: "Your sign-in email does not change. You still sign in the same way.",
  mandatory: "Please fix this now. You cannot skip it any more.",
  skip: (n) => `You can skip this ${n} more time${plural(n)}`,
  channels: {
    EMAIL: {
      title: "Let's fix your email!",
      headline: "School emails are not reaching you!",
      problem: (value) => ["We sent emails to ", value, " but they came back."],
      options: {
        CHANGE: ["Change my email", "I will type a new one"],
        CONFIRM: ["It is right", "Keep this email"],
        ALTERNATE: ["Add another email", "Use one more email too"],
      },
      codeHint: "",
      valueLabel: { CHANGE: "Type your new email", ALTERNATE: "Type one more email" },
      sendLabel: "Send code",
      codeLabel: "Type the 6 numbers from the email",
    },
    MOBILE: {
      title: "Let's fix your phone number!",
      headline: "Your phone number looks wrong.",
      problem: (value) => ["We have this number for you: ", value, ""],
      options: {
        CHANGE: ["Change my number", "I will type the right one"],
        CONFIRM: ["It is right", "Keep this number"],
      },
      codeHint: "We will send a code by text message (SMS) to check it.",
      valueLabel: { CHANGE: "Type your phone number" },
      sendLabel: "Send code",
      codeLabel: "Type the 6 numbers from the text message",
    },
    WHATSAPP: {
      title: "Let's fix your WhatsApp!",
      headline: "We could not reach you on WhatsApp.",
      problem: (value) => ["We tried this number: ", value, ""],
      options: {
        CHANGE: ["Give my WhatsApp number", "I will type the right one"],
        CONFIRM: ["It is right", "Keep this number"],
        NO_WHATSAPP: ["I don't use WhatsApp", "Stop asking me"],
      },
      codeHint: "We will send a code on WhatsApp to check it.",
      valueLabel: { CHANGE: "Type your WhatsApp number" },
      sendLabel: "Send code",
      codeLabel: "Type the 6 numbers we sent on WhatsApp",
    },
  },
  confirmLead: (channel, value) => [
    "We will send 6 numbers to ",
    value,
    `${channel === "WHATSAPP" ? " on WhatsApp" : channel === "MOBILE" ? " by text message (SMS)" : ""}. Type them here to show it is yours.`,
  ],
  alternateHint: "School emails will go to this email too. Your other email stays.",
  sent: (channel) => ({ EMAIL: "Code sent! Look in your email.", WHATSAPP: "Code sent! Look in WhatsApp." })[channel] || "Code sent! Look in your text messages.",
  noWhatsapp: {
    title: "Stop WhatsApp messages?",
    lead: (value) => ["We will stop sending WhatsApp messages to ", value, "."],
    note: "The school will still send you emails and text messages.",
    confirmLabel: "Yes, stop them",
  },
  done: {
    ...STANDARD.done,
    heading: (kind, firstName) => (firstName ? `All done! Thank you, ${firstName}!` : "All done! Thank you!"),
    text: (kind) =>
      ({
        "EMAIL:CHANGE": ["Your new email is saved: ", ""],
        "EMAIL:CONFIRM": ["We will keep using this email: ", ""],
        "EMAIL:ALTERNATE": ["Your other email is saved: ", ""],
        "MOBILE:CHANGE": ["Your new phone number is saved: ", ""],
        "MOBILE:CONFIRM": ["We will keep using this number: ", ""],
        "WHATSAPP:CHANGE": ["Your WhatsApp number is saved: ", ""],
        "WHATSAPP:CONFIRM": ["We will keep using this WhatsApp number: ", ""],
        "WHATSAPP:NO_WHATSAPP": ["We will not send you WhatsApp messages.", ""],
      })[kind] || ["", ""],
    nextNote: (channel) => ({ EMAIL: "Next we will check your email.", MOBILE: "Next we will check your phone number.", WHATSAPP: "Next we will check your WhatsApp." })[channel] || "",
    nextLabel: "Okay!",
    okLabel: "Okay!",
  },
  errors: {
    ...STANDARD.errors,
    EMAIL_EMPTY: "Type the email first.",
    EMAIL_FORMAT: "That does not look like an email. It should look like name@example.com.",
    EMAIL_SAME: 'This is the email that is not working. Type a new one, or go back and pick "It is right".',
    EMAIL_SAME_ALTERNATE: "You already use this email. Type a different one.",
    ISD_EMPTY: "Pick your country code.",
    NUMBER_EMPTY: "Type the number first.",
    NUMBER_FORMAT: "Type only the numbers, without the country code.",
    CODE_EMPTY: "Type the 6 numbers we sent you.",
    CODE_FORMAT: "The code has 6 numbers. Check it and try again.",
  },
};

/** band: "elementary" | "middle" | "high". */
export function contactCheckCopy(band) {
  return band === "elementary" ? ELEMENTARY : STANDARD;
}

// Step alerts / toasts the flow (utils/contactCheckFlow.js) and its hooks write in English -> contactCheck.alerts.<key>.
const ALERT_KEYS = {
  "This could not be done just now. Please try again in a minute.": "error",
  "The school server could not be reached. Check your connection and try again.": "unreachable",
  "Choose one of the options to continue.": "chooseOption",
  "Send the code first, then enter it here.": "sendFirst",
  "Your session has been logged out": "loggedOut",
};

/**
 * An alert of the flow in the dashboard's language (`t` = useTranslations("contactCheck")); a message the server
 * wrote is shown as it is.
 */
export function contactCheckAlertText(message, t) {
  if (!message) return message;
  const known = ALERT_KEYS[message];
  if (known) return t(`alerts.${known}`);
  const wait = /^You can ask for a new code in (\d+) seconds?\.$/.exec(message);
  return wait ? t("alerts.waitSeconds", { count: Number(wait[1]) }) : message;
}

/**
 * The same words in the dashboard's language: the shape of contactCheckCopy(band), read from the
 * contactCheck.copy messages. `t` is useTranslations("contactCheck.copy") (docs/i18n.md); a key the elementary
 * words do not have falls back to the standard one, as ELEMENTARY spreads STANDARD above. The [before, value, after]
 * sentences are cut around the {value} placeholder, so each language keeps its own word order.
 */
export function translateContactCheckCopy(band, t) {
  const english = contactCheckCopy(band);
  const own = band === "elementary" ? "elementary" : "standard";
  const key = (k) => (t.has(`${own}.${k}`) ? `${own}.${k}` : `standard.${k}`);
  const msg = (k, values) => t(key(k), values);
  const ownOnly = (k) => (t.has(`${own}.${k}`) ? t(`${own}.${k}`) : "");
  const MARK = "\u0001";
  const split = (k, value, values) => {
    const text = msg(k, { ...values, value: MARK });
    const at = text.indexOf(MARK);
    return at < 0 ? [text, "", ""] : [text.slice(0, at), value, text.slice(at + MARK.length)];
  };
  const kindKey = (kind) => String(kind).replace(":", "_");
  const channel = (c) => ({
    title: msg(`channels.${c}.title`),
    headline: ownOnly(`channels.${c}.headline`),
    problem: (value) => split(`channels.${c}.problem`, value),
    options: Object.fromEntries(
      Object.keys(english.channels[c].options).map((a) => [a, [msg(`channels.${c}.options.${a}.title`), msg(`channels.${c}.options.${a}.text`)]]),
    ),
    codeHint: ownOnly(`channels.${c}.codeHint`),
    valueLabel: Object.fromEntries(Object.keys(english.channels[c].valueLabel).map((a) => [a, msg(`channels.${c}.valueLabel.${a}`)])),
    sendLabel: msg(`channels.${c}.sendLabel`),
    codeLabel: msg(`channels.${c}.codeLabel`),
  });
  return {
    ...english,
    continueLabel: msg("continueLabel"),
    laterLabel: msg("laterLabel"),
    backLabel: msg("backLabel"),
    verifyLabel: msg("verifyLabel"),
    closeNowLabel: msg("closeNowLabel"),
    legend: msg("legend"),
    reasonLabel: msg("reasonLabel"),
    help: { choose: ownOnly("helpChoose"), code: ownOnly("helpCode") },
    stepLabel: msg("stepLabel"),
    resendLabel: msg("resendLabel"),
    resendLead: ownOnly("resendLead"),
    codePlaceholder: msg("codePlaceholder"),
    signIn: msg("signIn"),
    signInShort: msg("signInShort"),
    alsoMobile: msg("alsoMobile"),
    mandatory: msg("mandatory"),
    skip: (n) => msg("skip", { count: n }),
    channels: { EMAIL: channel("EMAIL"), MOBILE: channel("MOBILE"), WHATSAPP: channel("WHATSAPP") },
    confirmLead: (ch, value) => split("confirmLead", value, { channel: ch }),
    alternateHint: msg("alternateHint"),
    sent: (ch, sentTo) => msg("sent", { channel: String(ch), sentTo: String(sentTo ?? "") }),
    noWhatsapp: {
      title: msg("noWhatsapp.title"),
      lead: (value) => split("noWhatsapp.lead", value),
      note: msg("noWhatsapp.note"),
      confirmLabel: msg("noWhatsapp.confirmLabel"),
    },
    done: {
      heading: (kind, firstName) =>
        own === "elementary"
          ? firstName
            ? msg("done.headingNamed", { name: firstName })
            : msg("done.headingPlain")
          : t.has(`standard.done.heading.${kindKey(kind)}`)
            ? t(`standard.done.heading.${kindKey(kind)}`)
            : msg("done.headingDefault"),
      text: (kind, alsoMobile) => {
        const k = `done.text.${kindKey(kind)}`;
        if (!t.has(key(k))) return ["", ""];
        const [before, , after] = split(k, "", { alsoMobile: alsoMobile ? "yes" : "no" });
        return [before, after];
      },
      signIn: msg("done.signIn"),
      nextNote: (ch) => (t.has(key(`done.nextNote.${ch}`)) ? msg(`done.nextNote.${ch}`) : ""),
      nextLabel: msg("done.nextLabel"),
      okLabel: msg("done.okLabel"),
    },
    errors: Object.fromEntries(Object.keys(english.errors).map((code) => [code, msg(`errors.${code}`)])),
  };
}
