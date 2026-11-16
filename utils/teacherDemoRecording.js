// Teacher registration Step 2, the live demo recorder: everything the page decides, kept free of React so it is tested
// on its own (scripts/verifyTeacherDemoRecording.mjs). The server (is-rest-api TeacherDemoRules) decides what each
// attempt is doing and how many attempts are used; this file only maps, labels and schedules the polling.

export const DEMO_POLL_INTERVAL_MS = 10_000;
// The meeting runs 30 minutes and its recording takes a while to appear: stop asking after 40 minutes.
export const DEMO_POLL_MAX_MS = 40 * 60 * 1000;

// TeacherDemoRules.State
export const DEMO_STATE = {
  IN_PROGRESS: "IN_PROGRESS",
  WAITING: "WAITING",
  PROCESSING: "PROCESSING",
  READY: "READY",
  INVALID: "INVALID",
  TOO_SHORT: "TOO_SHORT",
};

const PENDING_STATES = new Set([DEMO_STATE.IN_PROGRESS, DEMO_STATE.WAITING, DEMO_STATE.PROCESSING]);
const DISCARDABLE_STATES = new Set([DEMO_STATE.INVALID, DEMO_STATE.TOO_SHORT]);

export const DEMO_STATE_LABELS = {
  [DEMO_STATE.IN_PROGRESS]: "Meeting in progress",
  [DEMO_STATE.WAITING]: "Waiting for the meeting to start",
  [DEMO_STATE.PROCESSING]: "Recording is being processed",
  [DEMO_STATE.READY]: "Ready",
  [DEMO_STATE.INVALID]: "Invalid recording",
  [DEMO_STATE.TOO_SHORT]: "Recording should be more than 1 minute",
};

// The file-name endings Lens gives its recordings, and what the teacher sees for them (the legacy wording).
const RECORDING_LABELS = [
  ["shared_screen_with_speaker_view_CC.mp4", "Shared Screen With Speaker View CC"],
  ["shared_screen_with_speaker_view.mp4", "Shared Screen with Speaker View"],
  ["shared_screen_with_gallery_view.mp4", "Shared Screen With Gallery View"],
  ["shared_screen.mp4", "Shared Screen"],
  ["active_speaker.mp4", "Active Speaker"],
  ["gallery_view.mp4", "Gallery View"],
  ["-1.1.mp4", "Recording"],
  ["-1.2.mp4", "Recording 2"],
  ["audio_only", "Audio File"],
];

// S3 storage classes a recording cannot be played from.
const UNPLAYABLE_STORAGE_CLASSES = new Set(["GLACIER", "DEEP_ARCHIVE", "RESTORING"]);

export function getDemoRecordingLabel(url) {
  const text = String(url ?? "");
  const match = RECORDING_LABELS.find(([key]) => text.includes(key));
  return match ? match[1] : "Recording";
}

export function isDemoRecordingPlayable(storageClass) {
  return !UNPLAYABLE_STORAGE_CLASSES.has(String(storageClass ?? "").toUpperCase());
}

/** "available" | "archived" | "restoring": what the recording list says next to each file (legacy badges). */
export function demoRecordingAvailability(storageClass) {
  const value = String(storageClass ?? "").toUpperCase();
  if (value === "GLACIER" || value === "DEEP_ARCHIVE") return "archived";
  if (value === "RESTORING") return "restoring";
  return "available";
}

const S3_RECORDINGS_PREFIX = "https://ischoolingwise.s3.us-east-1.amazonaws.com/recordings/";

/**
 * Where the transcript (.vtt) of a recording is, the legacy way: "<name>-<n.n>.mp4" becomes "<name>-transcript-<n.n>.vtt"
 * next to it; a recording that does not follow that name falls back to "<sessionId>-transcript-1.1.vtt" in the
 * recordings folder. null when the address is not an .mp4 or cannot be worked out.
 */
export function toTranscriptUrl(videoUrl) {
  const text = String(videoUrl ?? "");
  if (!text.endsWith(".mp4")) return null;
  let url;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  let transcript = url.origin + url.pathname.replace(/\/([^/]+)-(\d+\.\d+)\.mp4$/, "/$1-transcript-$2.vtt");
  if (transcript === text) {
    const sessionId = text.split(S3_RECORDINGS_PREFIX)[1]?.split("-")[0];
    if (!sessionId) return null;
    transcript = `${S3_RECORDINGS_PREFIX}${sessionId}-transcript-1.1.vtt`;
  }
  return transcript;
}

/**
 * The text of a transcript file -> the lines to show, or null when there is none (empty, or the storage's XML error).
 * Every line is kept as it is, timestamps included (legacy "showTime"): a teacher reads it as the panel would.
 */
export function parseDemoTranscript(content) {
  const text = String(content ?? "");
  if (!text.trim() || text.includes("<Error><Code>")) return null;
  return text.split("\n").map((line) => line.replace(/\r$/, ""));
}

/** The recording the transcript belongs to: the last one of the attempt (legacy), when it has recordings at all. */
export function transcriptSourceUrl(recordings) {
  return recordings?.length ? recordings[recordings.length - 1].url : null;
}

/** Whether the attempt state is one the recorder still has to wait for. */
export function isPendingDemoState(state) {
  return PENDING_STATES.has(state);
}

/** A failed attempt (nothing usable, or under a minute). */
export function isDiscardableDemoState(state) {
  return DISCARDABLE_STATES.has(state);
}

/**
 * The legacy "Re-attempt" button: a failed attempt (invalid, or under a minute) can always be redone; a finished one
 * only once every attempt is used and every attempt has ended (the teacher is stuck with what they have and may want
 * another try). An attempt still running or being processed never can.
 */
export function canReattemptDemo(state, { attemptsExhausted, allEnded }) {
  if (isDiscardableDemoState(state)) return true;
  return state === DEMO_STATE.READY && attemptsExhausted && allEnded;
}

function parseTime(value) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  // Lens writes zone-less times in UTC (the same reading the server uses to measure the length).
  const withZone = /(Z|[+-]\d{2}:?\d{2})$/i.test(text) ? text : `${text.replace(" ", "T")}Z`;
  const millis = Date.parse(withZone);
  return Number.isNaN(millis) ? null : millis;
}

/** "Nov 16, 2026, 3:30 PM" for a Lens time, in `timeZone` (default: the teacher's own browser zone); "" when unknown. */
export function formatDemoDateTime(value, timeZone) {
  const millis = parseTime(value);
  if (millis === null) return "";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    ...(timeZone ? { timeZone } : {}),
  }).format(new Date(millis));
}

/** "mm:ss" or "h:mm:ss" for a length in milliseconds; "" when it is unknown. */
export function formatDemoDuration(startTime, endTime) {
  const start = parseTime(startTime);
  const end = parseTime(endTime);
  if (start === null || end === null || end < start) return "";
  const total = Math.round((end - start) / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const two = (n) => String(n).padStart(2, "0");
  return hours > 0 ? `${hours}:${two(minutes)}:${two(seconds)}` : `${two(minutes)}:${two(seconds)}`;
}

/** "1st", "2nd", "3rd", "4th" ... "11th", "12th", "13th", "21st". */
export function ordinal(n) {
  const number = Number(n);
  const teen = number % 100;
  if (teen >= 11 && teen <= 13) return `${number}th`;
  switch (number % 10) {
    case 1:
      return `${number}st`;
    case 2:
      return `${number}nd`;
    case 3:
      return `${number}rd`;
    default:
      return `${number}th`;
  }
}

/**
 * get-teacher-demo-recordings -> what the recorder shows. null when the answer is not a success.
 *   { attempts: [{ id, meetingId, number, label, state, startTime, endTime, duration, recordings, canReattempt }],
 *     maxAttempts, attemptsUsed, canRecord }
 * Attempts are numbered in the order the server lists them. `recordings` drops the .json side files and says per file
 * whether it can still be played (an archived one cannot).
 */
export function mapDemoRecordings(response) {
  if (!response || (response.statusCode !== "SUCCESS" && response.status !== "1") || !Array.isArray(response.sessionDataList)) {
    return null;
  }
  const attemptsExhausted = response.canRecord !== true;
  const allEnded = response.sessionDataList.every((session) => Boolean(session.endDateTime));
  const attempts = response.sessionDataList.map((session, index) => {
    const number = index + 1;
    const recordings = (Array.isArray(session.recordingArray) ? session.recordingArray : [])
      .filter((recording) => recording?.url && !String(recording.url).toLowerCase().endsWith(".json"))
      .map((recording) => ({
        url: recording.url,
        label: getDemoRecordingLabel(recording.url),
        playable: isDemoRecordingPlayable(recording.storageClass),
        availability: demoRecordingAvailability(recording.storageClass),
      }));
    const state = Object.hasOwn(DEMO_STATE, session.state) ? session.state : DEMO_STATE.WAITING;
    return {
      id: session.id,
      meetingId: String(session.meetingId ?? ""),
      number,
      label: `${ordinal(number)} Attempt`,
      state,
      startTime: session.startDateTime || "",
      endTime: session.endDateTime || "",
      duration: formatDemoDuration(session.startDateTime, session.endDateTime),
      recordings,
      canReattempt: canReattemptDemo(state, { attemptsExhausted, allEnded }),
    };
  });
  const maxAttempts = Number(response.maxAttempts) > 0 ? Number(response.maxAttempts) : 2;
  const attemptsUsed = Number(response.attemptsUsed) >= 0 ? Number(response.attemptsUsed) : 0;
  return { attempts, maxAttempts, attemptsUsed, canRecord: response.canRecord === true };
}

export function hasPendingDemoAttempt(attempts) {
  return Boolean(attempts?.some((attempt) => isPendingDemoState(attempt.state)));
}

/**
 * How long until the recordings are asked for again, or false to stop. Keeps asking while an attempt is unfinished, and
 * also while a meeting the teacher has just started has not shown up in the list yet (`awaitingAfter` = how many
 * attempts there were when it was started), but never longer than DEMO_POLL_MAX_MS since the watching began.
 */
export function nextDemoPollInterval({ attempts, elapsedMs, awaitingAfter = null }) {
  if (elapsedMs >= DEMO_POLL_MAX_MS) return false;
  const count = attempts?.length ?? 0;
  const waitingForNewAttempt = awaitingAfter !== null && count <= awaitingAfter;
  return hasPendingDemoAttempt(attempts) || waitingForNewAttempt ? DEMO_POLL_INTERVAL_MS : false;
}

/** The chosen recording's meeting id when it is still one of the READY attempts, otherwise "" (nothing chosen). */
export function chosenDemoMeetingId(attempts, meetingId) {
  if (!meetingId) return "";
  return attempts?.some((attempt) => attempt.state === DEMO_STATE.READY && attempt.meetingId === meetingId) ? meetingId : "";
}

/**
 * What counts as chosen: the teacher's own choice while it is still a finished attempt; otherwise, when there is exactly
 * one finished attempt, that one (legacy preselected it and hid the choice); otherwise nothing ("").
 */
export function effectiveDemoChoice(attempts, savedMeetingId) {
  const chosen = chosenDemoMeetingId(attempts, savedMeetingId);
  if (chosen) return chosen;
  const ready = readyDemoAttempts(attempts);
  return ready.length === 1 ? ready[0].meetingId : "";
}

/** The attempts the teacher can still choose between. */
export function readyDemoAttempts(attempts) {
  return (attempts ?? []).filter((attempt) => attempt.state === DEMO_STATE.READY);
}

/** The label on the record button: "LIVE RECORD YOUR DEMO", then "... (2nd Attempt)" once one is used. */
export function demoRecordButtonLabel(attemptsUsed) {
  return attemptsUsed > 0 ? `LIVE RECORD YOUR DEMO (${ordinal(attemptsUsed + 1)} Attempt)` : "LIVE RECORD YOUR DEMO";
}

/**
 * The create-teacher-registration-demo-meeting body. Only who and what: the title, the start time, the duration and the
 * timezone are the server's to decide (the teacher's own timezone, not this browser's clock).
 */
export function buildCreateDemoMeetingRequest({ userId, schoolNumericId, reattempt = false }) {
  const request = { userId, schoolId: schoolNumericId, hostUserId: userId, meetingType: "1", gmType: "16" };
  // only names the meeting "Re-Attempt N" (the legacy title); the server decides everything else
  return reattempt ? { ...request, reattempt: true } : request;
}

/** The host link is opened in a new tab: only a web address, never a script or data URL. */
export function isSafeMeetingUrl(value) {
  try {
    const url = new URL(String(value ?? ""));
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/** The start-teacher-registration-demo-meeting body for a created meeting. */
export function buildStartDemoMeetingRequest({ meetingId, userId }) {
  return { entityType: "GENERAL_MEETINGS", entityId: meetingId, userId };
}
