// Contact check popup: the flow (utils/contactCheckFlow.js) and its words (components/contact-check/contactCheckCopy.js)
// against the rules of the existing dashboard's popup (is-rest-api contactCheck.js). No server needed.
// Run: npm run verify:contact-check
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  LOAD_TIMEOUT_MS,
  RESEND_SECONDS,
  actionsFor,
  createContactCheckFlow,
  displayValue,
  formatWhen,
  problemsOf,
  validateTarget,
} from "../utils/contactCheckFlow.js";
import { contactCheckCopy } from "../components/contact-check/contactCheckCopy.js";

const ok = (data = {}) => ({ ok: true, data });
const refused = (message, data) => ({ ok: false, refused: true, message, data });
const error = (message = "We couldn't do it just now.") => ({ ok: false, refused: false, message });

const EMAIL = { id: 11, channel: "EMAIL", value: "mia@old.example", isdCode: null, reason: "The mailbox is full.", laterLeft: 2, mandatory: false, canAddAlternate: true };
const MOBILE = { id: 12, channel: "MOBILE", value: "812345", isdCode: "65", reason: "Too short.", laterLeft: 2, mandatory: false, canAddAlternate: false };
const WHATSAPP = { id: 13, channel: "WHATSAPP", value: "81234567", isdCode: "+65", reason: "", laterLeft: 0, mandatory: true, canAddAlternate: false };

/** A flow over a scripted server: `answers[name]` is a result, or a function of the request. Calls are recorded. */
function setup(items, answers = {}, options = {}) {
  const calls = [];
  const clock = { now: 1_000_000 };
  const api = {};
  for (const name of ["pending", "sendCode", "verify", "noWhatsapp", "later"]) {
    api[name] = async (request) => {
      calls.push([name, request]);
      const answer = name === "pending" && !("pending" in answers) ? ok({ enabled: true, items, appInstalled: false }) : answers[name];
      return typeof answer === "function" ? answer(request) : answer;
    };
  }
  const flow = createContactCheckFlow({ api, now: () => clock.now, ...options });
  return { flow, calls, clock, named: (name) => calls.filter(([n]) => n === name).map(([, request]) => request) };
}

async function opened(items, answers, options) {
  const s = setup(items, answers, options);
  await s.flow.load();
  return s;
}

test("problems are shown in the order EMAIL, MOBILE, WHATSAPP; unknown channels and rows without an id are dropped", () => {
  const items = problemsOf({ enabled: true, items: [WHATSAPP, { id: 9, channel: "APP" }, MOBILE, { channel: "EMAIL" }, EMAIL, null] });
  assert.deepEqual(items.map((i) => i.channel), ["EMAIL", "MOBILE", "WHATSAPP"]);
  assert.deepEqual(problemsOf({ enabled: false, items: [EMAIL] }), []);
  assert.deepEqual(problemsOf({ enabled: true }), []);
  assert.deepEqual(problemsOf(null), []);
});

test("nothing is shown when the check is off, empty, failed or refused - and the dashboard may go on", async () => {
  for (const pending of [ok({ enabled: false, items: [EMAIL] }), ok({ enabled: true, items: [] }), error(), refused("Switched off"), null]) {
    const { flow } = await opened([], { pending });
    assert.equal(flow.getState().phase, "finished");
    assert.equal(flow.current(), null);
  }
  const thrown = await opened([], { pending: () => Promise.reject(new Error("network")) });
  assert.equal(thrown.flow.getState().phase, "finished");
});

test("nothing is shown when 'pending' gets no answer within 8 seconds, even if it answers later", async () => {
  let fire;
  let answer;
  const { flow } = setup([EMAIL], { pending: () => new Promise((resolve) => (answer = resolve)) }, {
    setTimer: (fn, ms) => {
      assert.equal(ms, LOAD_TIMEOUT_MS);
      assert.equal(ms, 8000);
      fire = fn;
      return 1;
    },
    clearTimer: () => {},
  });
  const loading = flow.load();
  assert.equal(flow.getState().phase, "loading");
  fire();
  await loading;
  assert.equal(flow.getState().phase, "finished");
  answer(ok({ enabled: true, items: [EMAIL] }));
  await Promise.resolve();
  assert.equal(flow.getState().phase, "finished");
});

test("'pending' is asked once per page load", async () => {
  const { flow, named } = setup([EMAIL]);
  await Promise.all([flow.load(), flow.load()]);
  await flow.load();
  assert.equal(named("pending").length, 1);
  assert.equal(flow.getState().phase, "open");
  assert.equal(flow.getState().step, "choose");
  assert.equal(flow.current().channel, "EMAIL");
});

test("'Add another email' only when the server allows it; 'I don't use WhatsApp' only for WhatsApp", () => {
  assert.deepEqual(actionsFor(EMAIL), ["CHANGE", "CONFIRM", "ALTERNATE"]);
  assert.deepEqual(actionsFor({ ...EMAIL, canAddAlternate: false }), ["CHANGE", "CONFIRM"]);
  assert.deepEqual(actionsFor(MOBILE), ["CHANGE", "CONFIRM"]);
  assert.deepEqual(actionsFor(WHATSAPP), ["CHANGE", "CONFIRM", "NO_WHATSAPP"]);
});

test("an option that is not offered cannot be chosen", async () => {
  const { flow } = await opened([{ ...EMAIL, canAddAlternate: false }]);
  flow.choose("ALTERNATE");
  assert.equal(flow.getState().action, "CHANGE");
  flow.choose("CONFIRM");
  assert.equal(flow.getState().action, "CONFIRM");
});

test("change email: choose -> code -> done, then the next problem, then the end", async () => {
  const { flow, named } = await opened([MOBILE, EMAIL], {
    sendCode: ok({ sentTo: "m***@new.example", channel: "EMAIL" }),
    verify: ok({ status: "FIXED" }),
  });
  assert.equal(flow.current().channel, "EMAIL", "email first");
  flow.proceed();
  assert.equal(flow.getState().step, "code");

  assert.deepEqual(await flow.sendCode({ value: "not-an-email" }), { error: { field: "value", code: "EMAIL_FORMAT" } });
  assert.equal(named("sendCode").length, 0, "a value that is not usable is never sent");

  assert.deepEqual(await flow.sendCode({ value: " mia@new.example " }), { sent: true });
  assert.deepEqual(named("sendCode")[0], { reviewId: 11, action: "CHANGE", value: "mia@new.example", isdCode: null });
  assert.equal(flow.getState().sent.sentTo, "m***@new.example");

  assert.deepEqual(await flow.verify("12345"), { error: "CODE_FORMAT" });
  assert.deepEqual(await flow.verify(""), { error: "CODE_EMPTY" });
  assert.equal(named("verify").length, 0);

  assert.deepEqual(await flow.verify("123456", true), { verified: true });
  assert.deepEqual(named("verify")[0], { reviewId: 11, action: "CHANGE", value: "mia@new.example", isdCode: null, code: "123456", alsoMobile: false });
  assert.equal(flow.getState().step, "done");
  assert.deepEqual(flow.getState().done, { channel: "EMAIL", action: "CHANGE", shown: "mia@new.example", alsoMobile: false });

  flow.next();
  assert.equal(flow.current().channel, "MOBILE");
  assert.equal(flow.getState().step, "choose");
  assert.equal(flow.getState().sent, null);
});

test("'It is correct' sends the code to the stored value; nothing typed is needed", async () => {
  const { flow, named } = await opened([MOBILE], { sendCode: ok({ sentTo: "+65 812345", channel: "MOBILE" }), verify: ok({}) });
  flow.choose("CONFIRM");
  flow.proceed();
  assert.deepEqual(await flow.sendCode({}), { sent: true });
  assert.deepEqual(named("sendCode")[0], { reviewId: 12, action: "CONFIRM", value: "812345", isdCode: "65" });
  await flow.verify("000111");
  assert.equal(named("verify")[0].value, "812345");
  assert.equal(flow.getState().step, "done");
  flow.next();
  assert.equal(flow.getState().phase, "finished");
  assert.equal(flow.getState().changed, true);
});

test("WhatsApp change: 'Also use this as my mobile number' is sent as alsoMobile; the ISD code keeps the server's form", async () => {
  const { flow, named } = await opened([WHATSAPP], { sendCode: ok({ channel: "WHATSAPP" }), verify: ok({}) });
  flow.proceed();
  assert.deepEqual(await flow.sendCode({ value: "9876 5432", isd: "" }), { error: { field: "isd", code: "ISD_EMPTY" } });
  assert.deepEqual(await flow.sendCode({ value: "12", isd: "65" }), { error: { field: "value", code: "NUMBER_FORMAT" } });
  await flow.sendCode({ value: "9876 5432", isd: "65" });
  assert.deepEqual(named("sendCode")[0], { reviewId: 13, action: "CHANGE", value: "98765432", isdCode: "+65" });
  assert.equal(flow.getState().sent.sentTo, "+65 98765432");
  await flow.verify("654321", true);
  assert.equal(named("verify")[0].alsoMobile, true);
  assert.equal(flow.getState().done.alsoMobile, true);
  assert.equal(validateTarget(MOBILE, "CHANGE", { value: "98765432", isd: "65" }).target.isdCode, "65");
});

test("the typed email must differ from the one that fails", () => {
  assert.equal(validateTarget(EMAIL, "CHANGE", { value: "MIA@old.example" }).error.code, "EMAIL_SAME");
  assert.equal(validateTarget(EMAIL, "ALTERNATE", { value: "mia@old.example" }).error.code, "EMAIL_SAME_ALTERNATE");
  assert.equal(validateTarget(EMAIL, "CHANGE", { value: "" }).error.code, "EMAIL_EMPTY");
});

test("resend: 30 seconds between two codes for the same value; a changed value needs (and may get) a new code at once", async () => {
  const { flow, named, clock } = await opened([EMAIL], { sendCode: ok({}) });
  flow.proceed();
  await flow.sendCode({ value: "a@new.example" });
  assert.equal(RESEND_SECONDS, 30);
  assert.equal(flow.getState().resendAt, clock.now + 30_000);

  clock.now += 10_000;
  await flow.sendCode({ value: "a@new.example" });
  assert.equal(named("sendCode").length, 1, "too early: not sent");
  assert.equal(flow.getState().alert, "You can ask for a new code in 20 seconds.");

  flow.valueEdited({ value: "a@new.example" });
  assert.notEqual(flow.getState().sent, null, "same value: the code still counts");
  flow.valueEdited({ value: "b@new.example" });
  assert.equal(flow.getState().sent, null, "the code was for the old value");
  await flow.verify("123456");
  assert.equal(named("verify").length, 0);
  assert.equal(flow.getState().alert, "Send the code first, then enter it here.");

  await flow.sendCode({ value: "b@new.example" });
  assert.equal(named("sendCode").length, 2);
  clock.now += 30_000;
  await flow.sendCode({ value: "b@new.example" });
  assert.equal(named("sendCode").length, 3, "after 30 seconds it is sent again");
});

test("a refused send-code shows the server's message as it is", async () => {
  const { flow } = await opened([EMAIL], { sendCode: refused("You have asked for too many codes. Try again in 1 hour.") });
  flow.proceed();
  assert.deepEqual(await flow.sendCode({ value: "a@new.example" }), {});
  assert.equal(flow.getState().alert, "You have asked for too many codes. Try again in 1 hour.");
  assert.equal(flow.getState().sent, null);
  assert.equal(flow.getState().busy, false);
  assert.equal(flow.current().closeNow, undefined, "not mandatory: 'Later' is still there, no 'Close for now'");
});

test("a wrong code is a refusal: the message is shown and the student tries again", async () => {
  let attempt = 0;
  const { flow } = await opened([EMAIL], { sendCode: ok({}), verify: () => (++attempt === 1 ? refused("That code is not right. 4 tries left.") : ok({})) });
  flow.proceed();
  await flow.sendCode({ value: "a@new.example" });
  assert.deepEqual(await flow.verify("111111"), { failed: true });
  assert.equal(flow.getState().alert, "That code is not right. 4 tries left.");
  assert.equal(flow.getState().step, "code");
  assert.deepEqual(await flow.verify("222222"), { verified: true });
  assert.equal(flow.getState().alert, "");
});

test("'Later' spends a skip and moves to the next problem", async () => {
  const { flow, named } = await opened([EMAIL, MOBILE], { later: ok({ laterLeft: 1, mandatory: false }) });
  await flow.later();
  assert.deepEqual(named("later"), [{ reviewId: 11 }]);
  assert.equal(flow.current().channel, "MOBILE");
  await flow.later();
  assert.equal(flow.getState().phase, "finished");
});

test("'Later' refused with data.mandatory: only then the problem becomes mandatory and stays open", async () => {
  const { flow, named } = await opened([EMAIL, MOBILE], { later: refused("You have already chosen Later 3 times.", { mandatory: true, laterLeft: 0 }) });
  await flow.later();
  assert.equal(flow.getState().phase, "open");
  assert.equal(flow.current().channel, "EMAIL");
  assert.equal(flow.current().mandatory, true);
  assert.equal(flow.current().laterLeft, 0);
  assert.equal(flow.getState().alert, "You have already chosen Later 3 times.");
  await flow.later();
  assert.equal(named("later").length, 1, "'Later' is not sent for a mandatory problem");
});

test("'Later' refused for any other reason: the message is shown and the flow moves on", async () => {
  const more = await opened([EMAIL, MOBILE], { later: refused("This was already answered.") });
  await more.flow.later();
  assert.equal(more.flow.current().channel, "MOBILE");
  assert.equal(more.flow.current().mandatory, false);
  assert.equal(more.flow.getState().alert, "This was already answered.");

  const last = await opened([EMAIL], { later: refused("This was already answered.", { mandatory: false }) });
  await last.flow.later();
  assert.equal(last.flow.getState().phase, "finished");
  assert.equal(last.flow.getState().farewell, "This was already answered.");
});

test("'Later' that cannot reach the server does not hold the student: the popup ends for this page load", async () => {
  const { flow } = await opened([EMAIL, MOBILE], { later: error() });
  await flow.later();
  assert.equal(flow.getState().phase, "finished");
});

test("mandatory: 'Close for now' only after send-code was refused or failed, and it never calls 'later'", async () => {
  for (const answer of [refused("Too many codes."), error("We couldn't send the code just now.")]) {
    const { flow, named } = await opened([WHATSAPP], { sendCode: answer });
    flow.closeForNow();
    assert.equal(flow.getState().phase, "open", "not offered before anything went wrong");
    flow.choose("CONFIRM");
    flow.proceed();
    await flow.sendCode({});
    assert.equal(flow.current().closeNow, true);
    assert.equal(flow.getState().alert, answer.message);
    flow.closeForNow();
    assert.equal(flow.getState().phase, "finished");
    assert.equal(named("later").length, 0);
  }
});

test("mandatory: 'Close for now' after an error on verify, but not after a wrong code", async () => {
  const wrong = await opened([WHATSAPP], { sendCode: ok({}), verify: refused("That code is not right.") });
  wrong.flow.choose("CONFIRM");
  wrong.flow.proceed();
  await wrong.flow.sendCode({});
  await wrong.flow.verify("111111");
  assert.equal(wrong.flow.current().closeNow, undefined);
  wrong.flow.closeForNow();
  assert.equal(wrong.flow.getState().phase, "open");

  const failed = await opened([WHATSAPP], { sendCode: ok({}), verify: error("We couldn't check the code just now.") });
  failed.flow.choose("CONFIRM");
  failed.flow.proceed();
  await failed.flow.sendCode({});
  await failed.flow.verify("111111");
  assert.equal(failed.flow.current().closeNow, true);
  assert.equal(failed.flow.getState().alert, "We couldn't check the code just now.");
  failed.flow.closeForNow();
  assert.equal(failed.flow.getState().phase, "finished");
  assert.equal(failed.named("later").length, 0);
});

test("a problem that is not mandatory never gets 'Close for now'", async () => {
  const { flow } = await opened([EMAIL], { sendCode: error() });
  flow.proceed();
  await flow.sendCode({ value: "a@new.example" });
  flow.closeForNow();
  assert.equal(flow.getState().phase, "open");
});

test("'I don't use WhatsApp' asks first, then calls no-whatsapp", async () => {
  const { flow, named } = await opened([WHATSAPP], { noWhatsapp: ok({ status: "NO_WHATSAPP" }) });
  flow.choose("NO_WHATSAPP");
  flow.proceed();
  assert.equal(flow.getState().step, "nowhatsapp");
  assert.equal(named("noWhatsapp").length, 0, "nothing is saved before the student confirms");
  flow.back();
  assert.equal(flow.getState().step, "choose");
  flow.proceed();
  await flow.noWhatsapp();
  assert.deepEqual(named("noWhatsapp"), [{ reviewId: 13 }]);
  assert.equal(flow.getState().step, "done");
  assert.equal(flow.getState().done.action, "NO_WHATSAPP");
});

test("Esc / outside click never skips a problem; on the last step it moves on", async () => {
  const { flow, named } = await opened([EMAIL, MOBILE], { sendCode: ok({}), verify: ok({}) });
  flow.dismiss();
  assert.equal(flow.getState().step, "choose");
  flow.proceed();
  flow.dismiss();
  assert.equal(flow.getState().step, "code");
  await flow.sendCode({ value: "a@new.example" });
  await flow.verify("123456");
  flow.dismiss();
  assert.equal(flow.current().channel, "MOBILE");
  assert.equal(named("later").length, 0);
});

test("while a request runs, nothing else starts", async () => {
  let release;
  const { flow, named } = await opened([EMAIL], { sendCode: () => new Promise((resolve) => (release = resolve)) });
  flow.proceed();
  const sending = flow.sendCode({ value: "a@new.example" });
  assert.equal(flow.getState().busy, true);
  await flow.sendCode({ value: "a@new.example" });
  flow.back();
  await flow.later();
  assert.equal(flow.getState().step, "code");
  assert.equal(named("sendCode").length, 1);
  assert.equal(named("later").length, 0);
  release(ok({}));
  await sending;
  assert.equal(flow.getState().busy, false);
});

test("times are shown in the student's time zone; Asia/Singapore when it is missing, blank or not valid", () => {
  const at = "2026-11-12T02:30:00Z";
  assert.match(formatWhen(at, "America/New_York"), /11 Nov 2026.*21:30/);
  const singapore = formatWhen(at, "Asia/Singapore");
  assert.match(singapore, /12 Nov 2026.*10:30/);
  for (const zone of [null, undefined, "", "   ", "Not/AZone"]) assert.equal(formatWhen(at, zone), singapore);
  assert.equal(formatWhen("", "Asia/Singapore"), "");
  assert.equal(formatWhen("yesterday", "Asia/Singapore"), "yesterday");
});

test("numbers are shown with their country code", () => {
  assert.equal(displayValue(MOBILE), "+65 812345");
  assert.equal(displayValue(WHATSAPP), "+65 81234567");
  assert.equal(displayValue(EMAIL), "mia@old.example");
});

test("words: every option, error and result has text in both wordings", () => {
  const codes = ["EMAIL_EMPTY", "EMAIL_FORMAT", "EMAIL_SAME", "EMAIL_SAME_ALTERNATE", "ISD_EMPTY", "NUMBER_EMPTY", "NUMBER_FORMAT", "CODE_EMPTY", "CODE_FORMAT"];
  for (const band of ["elementary", "middle", "high"]) {
    const copy = contactCheckCopy(band);
    for (const item of [EMAIL, MOBILE, WHATSAPP]) {
      const words = copy.channels[item.channel];
      assert.ok(words.title && words.sendLabel && words.codeLabel);
      for (const action of actionsFor(item)) {
        assert.equal(words.options[action].length, 2, `${band} ${item.channel} ${action}`);
        if (action !== "NO_WHATSAPP" && action !== "CONFIRM") assert.ok(words.valueLabel[action], `${band} ${item.channel} ${action} label`);
        assert.ok(copy.done.heading(`${item.channel}:${action}`, "Mia"));
        assert.ok(copy.done.text(`${item.channel}:${action}`, false)[0]);
      }
    }
    for (const code of codes) assert.ok(copy.errors[code], `${band} ${code}`);
  }
  assert.equal(contactCheckCopy("middle"), contactCheckCopy("high"));
  assert.equal(contactCheckCopy("elementary").channels.EMAIL.title, "Let's fix your email!");
  assert.equal(contactCheckCopy("elementary").done.heading("EMAIL:CHANGE", "Mia"), "All done! Thank you, Mia!");
  assert.equal(contactCheckCopy("middle").channels.EMAIL.title, "Check your email address");
  assert.equal(contactCheckCopy("high").skip(1), "You can skip this 1 more time.");
  assert.equal(contactCheckCopy("high").skip(2), "You can skip this 2 more times.");
});

test("live class running at load: nothing is shown and nothing is sent; the next popup is not kept waiting", async () => {
  const { flow, calls } = setup([EMAIL, MOBILE]);
  flow.setHold({ live: true });
  assert.equal(flow.getState().yielded, false);
  await flow.load();
  assert.equal(flow.getState().phase, "waiting");
  assert.equal(flow.getState().step, "");
  assert.equal(flow.getState().yielded, true);
  assert.deepEqual(calls.map(([name]) => name), ["pending"]);

  flow.proceed();
  await flow.later();
  flow.closeForNow();
  assert.equal(flow.getState().phase, "waiting", "nothing can be done to a popup that is not shown");
  assert.equal(calls.length, 1);

  flow.setHold({ live: false });
  assert.equal(flow.getState().phase, "open", "the class is over: the popup opens in the same page load");
  assert.equal(flow.current().channel, "EMAIL");
  assert.equal(flow.getState().step, "choose");
  assert.equal(flow.getState().yielded, true, "the next popup is never held back again");
  assert.equal(calls.length, 1, "'pending' is not asked again");
});

test("a live class that starts while the popup is open closes it without 'later'; it comes back at the same problem", async () => {
  const { flow, named, calls } = await opened([EMAIL, MOBILE], { sendCode: ok({}), later: ok({}) });
  await flow.later();
  assert.equal(flow.current().channel, "MOBILE");
  flow.proceed();
  await flow.sendCode({ value: "98765432", isd: "65" });
  const before = calls.length;

  flow.setHold({ live: true });
  assert.equal(flow.getState().phase, "waiting");
  assert.equal(flow.getState().sent, null);
  assert.equal(calls.length, before, "closing for a class sends nothing");
  assert.equal(named("later").length, 1, "only the student's own 'Later' was spent");

  flow.setHold({ live: false });
  assert.equal(flow.getState().phase, "open");
  assert.equal(flow.current().channel, "MOBILE");
  assert.equal(flow.getState().step, "choose");
});

test("a live class that starts while a request runs: the late answer changes nothing", async () => {
  let release;
  const { flow } = await opened([EMAIL], { sendCode: () => new Promise((resolve) => (release = resolve)) });
  flow.proceed();
  const sending = flow.sendCode({ value: "a@new.example" });
  flow.setHold({ live: true });
  release(ok({}));
  await sending;
  assert.equal(flow.getState().phase, "waiting");
  assert.equal(flow.getState().busy, false);
  assert.equal(flow.getState().sent, null);
});

test("a live class that starts on the saved step: that problem is not asked again", async () => {
  const two = await opened([EMAIL, MOBILE], { sendCode: ok({}), verify: ok({}) });
  two.flow.proceed();
  await two.flow.sendCode({ value: "a@new.example" });
  await two.flow.verify("123456");
  two.flow.setHold({ live: true });
  assert.equal(two.flow.getState().phase, "waiting");
  two.flow.setHold({ live: false });
  assert.equal(two.flow.current().channel, "MOBILE");

  const one = await opened([EMAIL], { sendCode: ok({}), verify: ok({}) });
  one.flow.proceed();
  await one.flow.sendCode({ value: "a@new.example" });
  await one.flow.verify("123456");
  one.flow.setHold({ live: true });
  assert.equal(one.flow.getState().phase, "finished");
});

test("another popup open at load: the contact check waits for it; one that appears later does not close it", async () => {
  const { flow } = setup([EMAIL]);
  flow.setHold({ popup: true });
  await flow.load();
  assert.equal(flow.getState().phase, "waiting");
  flow.setHold({ live: true });
  flow.setHold({ popup: false });
  assert.equal(flow.getState().phase, "waiting", "still a live class");
  flow.setHold({ live: false });
  assert.equal(flow.getState().phase, "open");
  flow.setHold({ popup: true });
  assert.equal(flow.getState().phase, "open");
});

test("a hold never brings back a popup that is over, and nothing to show stays nothing", async () => {
  const none = setup([]);
  none.flow.setHold({ live: true });
  await none.flow.load();
  assert.equal(none.flow.getState().phase, "finished");
  none.flow.setHold({ live: false });
  assert.equal(none.flow.getState().phase, "finished");

  const over = await opened([EMAIL], { later: ok({}) });
  assert.equal(over.flow.getState().yielded, false, "while the popup is open the next popup waits");
  await over.flow.later();
  over.flow.setHold({ live: true });
  over.flow.setHold({ live: false });
  assert.equal(over.flow.getState().phase, "finished");
  assert.equal(over.flow.getState().yielded, true);
});
