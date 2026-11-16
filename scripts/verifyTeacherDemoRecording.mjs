// Teacher registration Step 2, the live demo recorder: how the server's answer is mapped, how long the page keeps
// asking for recordings, and the labels (utils/teacherDemoRecording.js). No server needed.
// Run: npm run verify:teacher-demo
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEMO_POLL_INTERVAL_MS,
  DEMO_POLL_MAX_MS,
  DEMO_STATE,
  buildCreateDemoMeetingRequest,
  buildStartDemoMeetingRequest,
  chosenDemoMeetingId,
  demoRecordButtonLabel,
  demoRecordingAvailability,
  effectiveDemoChoice,
  formatDemoDateTime,
  formatDemoDuration,
  getDemoRecordingLabel,
  hasPendingDemoAttempt,
  isDemoRecordingPlayable,
  isSafeMeetingUrl,
  mapDemoRecordings,
  nextDemoPollInterval,
  ordinal,
  parseDemoTranscript,
  readyDemoAttempts,
  toTranscriptUrl,
  transcriptSourceUrl,
} from "../utils/teacherDemoRecording.js";

const session = (patch) => ({
  id: 1,
  meetingId: "m1",
  startDateTime: "2026-11-16T10:00:00Z",
  endDateTime: "2026-11-16T10:20:00Z",
  state: "READY",
  recordingArray: [{ url: "https://s3.example/recordings/1-1.1.mp4" }],
  ...patch,
});

const answer = (sessions, patch = {}) => ({
  statusCode: "SUCCESS",
  sessionDataList: sessions,
  maxAttempts: 2,
  attemptsUsed: sessions.length,
  canRecord: sessions.length < 2,
  ...patch,
});

test("an unsuccessful or malformed answer maps to null", () => {
  assert.equal(mapDemoRecordings(null), null);
  assert.equal(mapDemoRecordings({ statusCode: "FAILED", sessionDataList: [] }), null);
  assert.equal(mapDemoRecordings({ statusCode: "SUCCESS" }), null);
});

test("attempts are numbered in order and carry the server's state, times and limit", () => {
  const mapped = mapDemoRecordings(answer([session({ id: 4 }), session({ id: 9, meetingId: "m2", state: "PROCESSING", recordingArray: [] })]));
  assert.deepEqual(
    mapped.attempts.map((a) => [a.id, a.number, a.label, a.state, a.meetingId]),
    [
      [4, 1, "1st Attempt", "READY", "m1"],
      [9, 2, "2nd Attempt", "PROCESSING", "m2"],
    ]
  );
  assert.equal(mapped.attempts[0].duration, "20:00");
  assert.equal(mapped.maxAttempts, 2);
  assert.equal(mapped.attemptsUsed, 2);
  assert.equal(mapped.canRecord, false);
});

test("canRecord is only what the server says, and the limit falls back to 2", () => {
  assert.equal(mapDemoRecordings(answer([], { canRecord: true })).canRecord, true);
  assert.equal(mapDemoRecordings(answer([], { canRecord: undefined })).canRecord, false);
  assert.equal(mapDemoRecordings(answer([], { maxAttempts: undefined })).maxAttempts, 2);
});

test("an unknown state is treated as waiting, never as ready", () => {
  assert.equal(mapDemoRecordings(answer([session({ state: "constructor" })])).attempts[0].state, DEMO_STATE.WAITING);
  assert.equal(mapDemoRecordings(answer([session({ state: undefined })])).attempts[0].state, DEMO_STATE.WAITING);
});

test("a failed attempt can always be redone; a finished one only when every attempt is used and ended", () => {
  const states = ["IN_PROGRESS", "WAITING", "PROCESSING", "READY", "INVALID", "TOO_SHORT"];
  const list = states.map((state, i) => session({ id: i + 1, state, endDateTime: "2026-11-16 10:30:00" }));
  const redoable = (response) => mapDemoRecordings(response).attempts.filter((a) => a.canReattempt).map((a) => a.state);
  // attempts left: only the failed ones
  assert.deepEqual(redoable(answer(list, { canRecord: true })), ["INVALID", "TOO_SHORT"]);
  // all used and all ended: the finished one too (legacy)
  assert.deepEqual(redoable(answer(list, { canRecord: false })), ["READY", "INVALID", "TOO_SHORT"]);
  // all used, but one has not ended yet: the finished one cannot
  const running = list.map((s, i) => (i === 0 ? { ...s, endDateTime: "" } : s));
  assert.deepEqual(redoable(answer(running, { canRecord: false })), ["INVALID", "TOO_SHORT"]);
});

test("a re-attempt only asks the server for the Re-Attempt title", () => {
  assert.equal("reattempt" in buildCreateDemoMeetingRequest({ userId: 7, schoolNumericId: 3 }), false);
  assert.equal(buildCreateDemoMeetingRequest({ userId: 7, schoolNumericId: 3, reattempt: true }).reattempt, true);
});

test("recordings drop the json side files and say what can be played", () => {
  const mapped = mapDemoRecordings(
    answer([
      session({
        recordingArray: [
          { url: "https://s3.example/r/1-1.1.mp4" },
          { url: "https://s3.example/r/1-active_speaker.mp4", storageClass: "GLACIER" },
          { url: "https://s3.example/r/1-meta.JSON" },
          { url: "" },
        ],
      }),
    ])
  );
  const [first, second, ...rest] = mapped.attempts[0].recordings;
  assert.equal(rest.length, 0);
  assert.deepEqual([first.label, first.playable, first.availability], ["Recording", true, "available"]);
  assert.deepEqual([second.label, second.playable, second.availability], ["Active Speaker", false, "archived"]);
});

test("every file Lens made is listed, each with its own availability", () => {
  const mapped = mapDemoRecordings(
    answer([
      session({
        recordingArray: [
          { url: "https://s3.example/r/1-shared_screen_with_speaker_view.mp4" },
          { url: "https://s3.example/r/1-gallery_view.mp4", storageClass: "DEEP_ARCHIVE" },
          { url: "https://s3.example/r/1-audio_only.m4a", storageClass: "RESTORING" },
        ],
      }),
    ])
  );
  assert.deepEqual(
    mapped.attempts[0].recordings.map((r) => [r.label, r.availability, r.playable]),
    [
      ["Shared Screen with Speaker View", "available", true],
      ["Gallery View", "archived", false],
      ["Audio File", "restoring", false],
    ]
  );
  assert.equal(demoRecordingAvailability(undefined), "available");
  assert.equal(demoRecordingAvailability("glacier"), "archived");
});

test("the transcript sits next to the recording, the legacy way", () => {
  assert.equal(toTranscriptUrl("https://s3.example/recordings/55-1.1.mp4"), "https://s3.example/recordings/55-transcript-1.1.vtt");
  assert.equal(toTranscriptUrl("https://s3.example/recordings/55-1.2.mp4"), "https://s3.example/recordings/55-transcript-1.2.vtt");
  // a name that does not follow the pattern falls back to the session's own transcript in the recordings folder
  assert.equal(
    toTranscriptUrl("https://ischoolingwise.s3.us-east-1.amazonaws.com/recordings/77-shared_screen.mp4"),
    "https://ischoolingwise.s3.us-east-1.amazonaws.com/recordings/77-transcript-1.1.vtt"
  );
  assert.equal(toTranscriptUrl("https://s3.example/recordings/55-shared_screen.mp4"), null, "no way to work it out");
  assert.equal(toTranscriptUrl("https://s3.example/recordings/55-audio_only.m4a"), null, "only an .mp4 has one");
  assert.equal(toTranscriptUrl("not a url.mp4"), null);
  assert.equal(toTranscriptUrl(undefined), null);
});

test("the transcript belongs to the last recording of the attempt", () => {
  assert.equal(transcriptSourceUrl([{ url: "a.mp4" }, { url: "b.mp4" }]), "b.mp4");
  assert.equal(transcriptSourceUrl([]), null);
  assert.equal(transcriptSourceUrl(undefined), null);
});

test("a transcript keeps every line, and an empty or storage-error answer is 'none available'", () => {
  assert.deepEqual(parseDemoTranscript("WEBVTT\r\n\r\n1\r\n00:00:01.000 --> 00:00:02.000\r\nHello"), [
    "WEBVTT",
    "",
    "1",
    "00:00:01.000 --> 00:00:02.000",
    "Hello",
  ]);
  assert.equal(parseDemoTranscript(""), null);
  assert.equal(parseDemoTranscript("   \n"), null);
  assert.equal(parseDemoTranscript(null), null);
  assert.equal(parseDemoTranscript("<Error><Code>NoSuchKey</Code></Error>"), null);
});

test("recording labels follow the legacy file names", () => {
  assert.equal(getDemoRecordingLabel("x/shared_screen_with_speaker_view_CC.mp4"), "Shared Screen With Speaker View CC");
  assert.equal(getDemoRecordingLabel("x/shared_screen_with_speaker_view.mp4"), "Shared Screen with Speaker View");
  assert.equal(getDemoRecordingLabel("x/shared_screen.mp4"), "Shared Screen");
  assert.equal(getDemoRecordingLabel("x/9-1.2.mp4"), "Recording 2");
  assert.equal(getDemoRecordingLabel("x/audio_only.m4a"), "Audio File");
  assert.equal(getDemoRecordingLabel("x/unknown.mp4"), "Recording");
});

test("archived and restoring recordings cannot be played", () => {
  assert.equal(isDemoRecordingPlayable(undefined), true);
  assert.equal(isDemoRecordingPlayable("STANDARD"), true);
  for (const storageClass of ["GLACIER", "DEEP_ARCHIVE", "RESTORING", "glacier"]) {
    assert.equal(isDemoRecordingPlayable(storageClass), false, storageClass);
  }
});

test("the page keeps asking while an attempt is unfinished", () => {
  const pending = mapDemoRecordings(answer([session({ state: "PROCESSING", recordingArray: [] })])).attempts;
  const done = mapDemoRecordings(answer([session()])).attempts;
  const failed = mapDemoRecordings(answer([session({ state: "INVALID" }), session({ state: "TOO_SHORT" })])).attempts;
  assert.equal(nextDemoPollInterval({ attempts: pending, elapsedMs: 0 }), DEMO_POLL_INTERVAL_MS);
  assert.equal(nextDemoPollInterval({ attempts: done, elapsedMs: 0 }), false);
  assert.equal(nextDemoPollInterval({ attempts: failed, elapsedMs: 0 }), false);
  assert.equal(nextDemoPollInterval({ attempts: undefined, elapsedMs: 0 }), false);
  assert.equal(hasPendingDemoAttempt(pending), true);
  assert.equal(hasPendingDemoAttempt(done), false);
});

test("it gives up after 40 minutes, even with an unfinished attempt", () => {
  const pending = mapDemoRecordings(answer([session({ state: "IN_PROGRESS", recordingArray: [] })])).attempts;
  assert.equal(nextDemoPollInterval({ attempts: pending, elapsedMs: DEMO_POLL_MAX_MS - 1 }), DEMO_POLL_INTERVAL_MS);
  assert.equal(nextDemoPollInterval({ attempts: pending, elapsedMs: DEMO_POLL_MAX_MS }), false);
});

test("a meeting just started is waited for until it shows up in the list", () => {
  const none = [];
  const one = mapDemoRecordings(answer([session()])).attempts;
  const two = mapDemoRecordings(answer([session(), session({ id: 2, meetingId: "m2" })])).attempts;
  // started with no attempts yet: wait while the list is still empty
  assert.equal(nextDemoPollInterval({ attempts: none, elapsedMs: 0, awaitingAfter: 0 }), DEMO_POLL_INTERVAL_MS);
  // started with one finished attempt: wait until a second one appears, and stop waiting once it has
  assert.equal(nextDemoPollInterval({ attempts: one, elapsedMs: 0, awaitingAfter: 1 }), DEMO_POLL_INTERVAL_MS);
  assert.equal(nextDemoPollInterval({ attempts: two, elapsedMs: 0, awaitingAfter: 1 }), false);
  // not waiting for anything
  assert.equal(nextDemoPollInterval({ attempts: none, elapsedMs: 0, awaitingAfter: null }), false);
  // and never past the limit
  assert.equal(nextDemoPollInterval({ attempts: none, elapsedMs: DEMO_POLL_MAX_MS, awaitingAfter: 0 }), false);
});

test("a chosen recording only counts while it is still a ready attempt", () => {
  const attempts = mapDemoRecordings(
    answer([session({ meetingId: "m1" }), session({ id: 2, meetingId: "m2", state: "INVALID" }), session({ id: 3, meetingId: "m3", state: "PROCESSING" })])
  ).attempts;
  assert.equal(chosenDemoMeetingId(attempts, "m1"), "m1");
  assert.equal(chosenDemoMeetingId(attempts, "m2"), "", "a failed attempt cannot be chosen");
  assert.equal(chosenDemoMeetingId(attempts, "m3"), "", "an unfinished one cannot be chosen");
  assert.equal(chosenDemoMeetingId(attempts, "someone-elses"), "");
  assert.equal(chosenDemoMeetingId(attempts, ""), "");
  assert.equal(chosenDemoMeetingId(undefined, "m1"), "");
  assert.deepEqual(readyDemoAttempts(attempts).map((a) => a.meetingId), ["m1"]);
});

test("with exactly one finished attempt it is the choice; with several the teacher has to choose", () => {
  const one = mapDemoRecordings(answer([session({ meetingId: "m1" }), session({ id: 2, meetingId: "m2", state: "PROCESSING" })])).attempts;
  const two = mapDemoRecordings(answer([session({ meetingId: "m1" }), session({ id: 2, meetingId: "m2" })])).attempts;
  assert.equal(effectiveDemoChoice(one, ""), "m1");
  assert.equal(effectiveDemoChoice(one, "stale"), "m1");
  assert.equal(effectiveDemoChoice(two, ""), "", "two to pick from: nothing is chosen for them");
  assert.equal(effectiveDemoChoice(two, "m2"), "m2");
  assert.equal(effectiveDemoChoice(two, "stale"), "");
  assert.equal(effectiveDemoChoice([], ""), "");
  assert.equal(effectiveDemoChoice(undefined, "m1"), "");
});

test("the record button says which attempt comes next", () => {
  assert.equal(demoRecordButtonLabel(0), "LIVE RECORD YOUR DEMO");
  assert.equal(demoRecordButtonLabel(1), "LIVE RECORD YOUR DEMO (2nd Attempt)");
  assert.equal(demoRecordButtonLabel(2), "LIVE RECORD YOUR DEMO (3rd Attempt)");
});

test("ordinals, including the teens", () => {
  assert.deepEqual([1, 2, 3, 4, 11, 12, 13, 21, 22, 101, 111].map(ordinal), [
    "1st",
    "2nd",
    "3rd",
    "4th",
    "11th",
    "12th",
    "13th",
    "21st",
    "22nd",
    "101st",
    "111th",
  ]);
});

test("durations: unknown stays blank, hours only when there are some", () => {
  assert.equal(formatDemoDuration("2026-11-16T10:00:00Z", "2026-11-16T10:00:59Z"), "00:59");
  assert.equal(formatDemoDuration("2026-11-16T10:00:00Z", "2026-11-16T10:20:05Z"), "20:05");
  assert.equal(formatDemoDuration("2026-11-16T10:00:00Z", "2026-11-16T11:02:03Z"), "1:02:03");
  assert.equal(formatDemoDuration("2026-11-16 10:00:00", "2026-11-16 10:05:00"), "05:00", "a zone-less time is read as UTC, like the server does");
  assert.equal(formatDemoDuration("", "2026-11-16T10:00:00Z"), "");
  assert.equal(formatDemoDuration("2026-11-16T10:05:00Z", "2026-11-16T10:00:00Z"), "");
  assert.equal(formatDemoDuration("garbage", "garbage"), "");
});

test("a Lens time is shown in the zone asked for", () => {
  assert.equal(formatDemoDateTime("2026-11-16T10:00:00Z", "Asia/Kolkata"), "Nov 16, 2026, 3:30 PM");
  assert.equal(formatDemoDateTime("2026-11-16T10:00:00Z", "Asia/Singapore"), "Nov 16, 2026, 6:00 PM");
  assert.equal(formatDemoDateTime("", "Asia/Kolkata"), "");
});

test("creating a meeting sends who and what, never a time, a title or a timezone", () => {
  const request = buildCreateDemoMeetingRequest({ userId: 7, schoolNumericId: 1 });
  assert.deepEqual(request, { userId: 7, schoolId: 1, hostUserId: 7, meetingType: "1", gmType: "16" });
  for (const key of ["startDate", "startTime", "timezone", "title", "duration"]) {
    assert.equal(key in request, false, key);
  }
  assert.deepEqual(buildStartDemoMeetingRequest({ meetingId: 1896, userId: 7 }), {
    entityType: "GENERAL_MEETINGS",
    entityId: 1896,
    userId: 7,
  });
});

test("only a web address is opened as the host link", () => {
  assert.equal(isSafeMeetingUrl("https://lens.example/host/abc"), true);
  assert.equal(isSafeMeetingUrl("http://localhost:3000/x"), true);
  assert.equal(isSafeMeetingUrl("javascript:alert(1)"), false);
  assert.equal(isSafeMeetingUrl("data:text/html,hi"), false);
  assert.equal(isSafeMeetingUrl(""), false);
  assert.equal(isSafeMeetingUrl(undefined), false);
});
