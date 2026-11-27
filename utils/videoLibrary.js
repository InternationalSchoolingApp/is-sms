// Video Library (student) — the pure helpers of legacy studentVideoLibrary.js / studentVideoLibraryContent.js.

export const PLAN_NAMES = {
  TRIAL: "Free trial",
  THREE_COURSES: "3-course plan",
  CUSTOM: "Custom plan",
  ALL: "All-courses plan",
  LIFETIME: "Full course plan",
};

/** Steps of one course (svlBuildSteps): each lesson that has videos, then the videos without a lesson. */
export function buildSteps(detail) {
  const steps = [];
  (detail?.lessons ?? []).forEach((lesson) => {
    if (lesson.videos?.length) steps.push({ lesson, videos: lesson.videos });
  });
  (detail?.otherVideos ?? []).forEach((video) => steps.push({ lesson: null, videos: [video] }));
  return steps;
}

/** A lesson counts as watched when any teacher's explanation of it was watched. */
export const stepDone = (step) => Boolean(step?.videos.some((v) => v.watchCompleted));
export const stepPercent = (step) => (step ? step.videos.reduce((max, v) => Math.max(max, v.watchedPercent || 0), 0) : 0);
export const isLocked = (detail) => Boolean(detail?.playlist?.locked);

export function courseKey(detail) {
  const p = detail?.playlist ?? {};
  return p.id ? `p${p.id}` : `c${p.standardName || ""}|${p.title || ""}`;
}

/**
 * svlRestoreLastPosition(): "Continue where you left off" — the video watched last (server), else the
 * course / video remembered in this browser; locked courses are skipped. Returns
 * { active, stepIndex, videoIndex, resumeAt: {videoId, seconds} | null }.
 */
export function restorePosition(playlists, saved) {
  const position = { active: Math.max(0, playlists.findIndex((d) => !isLocked(d))), stepIndex: 0, videoIndex: 0, resumeAt: null };
  let best = null;
  playlists.forEach((detail, p) => {
    if (isLocked(detail)) return;
    buildSteps(detail).forEach((step, s) => {
      step.videos.forEach((video, i) => {
        const at = parseInt(video.lastWatchedAt || "0", 10);
        if (at && (!best || at > best.at)) best = { p, s, i, video, at };
      });
    });
  });
  if (best) {
    const steps = buildSteps(playlists[best.p]);
    position.active = best.p;
    if (best.video.watchCompleted && best.s < steps.length - 1) {
      position.stepIndex = best.s + 1; // finished it -> the next lesson
    } else {
      position.stepIndex = best.s;
      position.videoIndex = best.i;
      if (!best.video.watchCompleted && (best.video.lastPosition || 0) > 5) {
        position.resumeAt = { videoId: best.video.id, seconds: best.video.lastPosition };
      }
    }
    return position;
  }
  if (!saved?.course) return position;
  const p = playlists.findIndex((d) => courseKey(d) === saved.course && !isLocked(d));
  if (p < 0) return position;
  position.active = p;
  buildSteps(playlists[p]).forEach((step, s) => {
    if (step.videos.some((v) => v.id === saved.videoId)) position.stepIndex = s;
  });
  return position;
}

/** Search across every course (svlSearchHits). */
export function searchHits(playlists, query) {
  const hits = [];
  playlists.forEach((detail, p) => {
    const course = detail.playlist?.title || "";
    buildSteps(detail).forEach((step, s) => {
      step.videos.forEach((video, v) => {
        const hay = [video.title, video.description, step.lesson ? step.lesson.title : ""].join(" ").toLowerCase();
        if (hay.includes(query)) {
          hits.push({
            p,
            s,
            v,
            video,
            course,
            locked: isLocked(detail),
            lessonLabel: step.lesson ? `M${step.lesson.moduleNo} · L${step.lesson.lessonNo}` : "",
          });
        }
      });
    });
  });
  return hits;
}

export function parseYoutubeId(url) {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([\w-]{11})/);
  if (match) return match[1];
  return /^[\w-]{11}$/.test(url.trim()) ? url.trim() : null;
}

/** svlThumbUrl(); `apiBase` = "{origin}/{schoolUUID}/api/v1/video-library/" (a locked course's thumbnail is served there). */
export function thumbUrl(video, apiBase) {
  if (video.thumbnailUrl) return video.thumbnailUrl;
  const ytId = video.youtubeId || parseYoutubeId(video.videoUrl);
  if (ytId) return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
  if (video.youtubeThumb && video.id) return `${apiBase}student/thumbnail/${encodeURIComponent(video.id)}`;
  return null;
}

export function fmtDate(ms) {
  return new Date(Number(ms)).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function daysLeft(ms) {
  const days = Math.ceil((Number(ms) - Date.now()) / 86400000);
  return days <= 0 ? "ends today" : days === 1 ? "1 day left" : `${days} days left`;
}

export function fmtTime(seconds) {
  const sec = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h ? `${h}:` : ""}${h ? String(m).padStart(2, "0") : m}:${String(s).padStart(2, "0")}`;
}

/** epoch millis already past. */
export const isPast = (ms) => Number(ms) < Date.now();

/** A renewal that starts later than a minute from now: " · starts {date}", else "". */
export const startsLaterText = (ms) => (ms && Number(ms) > Date.now() + 60000 ? ` · starts ${fmtDate(ms)}` : "");

export const money = (n) => (Number(n) || 0).toFixed(2);

// ---- subscription state (svlRenewDue / svlTrialOnly / svlFullCourseRunning / svlCourseAccess) ----

/** A monthly plan (paid / granted) ends within the renewal window and nothing follows it yet. */
export function renewDue(access) {
  if (!access?.paywall) return false;
  const subs = access.subscriptions ?? [];
  const monthly = subs.filter((s) => s.planCode !== "TRIAL" && s.planCode !== "LIFETIME" && s.endDate);
  if (!monthly.length || subs.some((s) => s.planCode === "LIFETIME")) return false;
  const lastEnd = Math.max(...monthly.map((s) => Number(s.endDate)));
  return lastEnd - Date.now() <= (access.renewBeforeDays || 0) * 86400000;
}

export function trialOnly(access) {
  const subs = (access?.paywall && access.subscriptions) || [];
  return subs.length > 0 && subs.every((s) => s.planCode === "TRIAL");
}

/** A Full course plan is running: nothing can be bought meanwhile. */
export const fullCourseRunning = (access) => Boolean(access?.paywall && (access.subscriptions ?? []).some((s) => s.planCode === "LIFETIME"));

export function courseAccess(access, playlist) {
  const key = String(playlist.title || "").trim().toLowerCase();
  return (access?.courses ?? []).find((c) => c.standardId === playlist.standardId && String(c.courseTitle || "").trim().toLowerCase() === key) ?? null;
}

// ---- the Subscribe modal (svlPlanCards / svlPickNeed / svlPickValid / svlPickTotal) ----

/** The custom plan becomes one card per course count ("1 course", "2 courses"), first. */
export function planCards(options) {
  const custom = [];
  const rest = [];
  (options?.plans ?? []).forEach((plan) => {
    if (plan.planCode === "CUSTOM") {
      for (let n = Math.max(plan.minCourses, 1); n <= plan.maxCourses; n += 1) custom.push({ key: `CUSTOM:${n}`, plan, count: n });
    } else {
      rest.push({ key: plan.planCode, plan, count: plan.minCourses });
    }
  });
  return custom.concat(rest);
}

export const pickKey = (pick) => (pick.planCode === "CUSTOM" ? `CUSTOM:${pick.count}` : pick.planCode);
export const pickedPlan = (options, pick) => (options?.plans ?? []).find((p) => p.planCode === pick.planCode) ?? null;

/** How many courses the chosen card needs (0 = all of them, nothing to choose). */
export function pickNeed(options, pick) {
  const plan = pickedPlan(options, pick);
  if (!plan || plan.minCourses === 0) return 0;
  return plan.planCode === "CUSTOM" ? pick.count : plan.minCourses;
}

export function pickValid(options, pick) {
  if (!pickedPlan(options, pick)) return false;
  const need = pickNeed(options, pick);
  return need === 0 || pick.subjectIds.length === need;
}

/** Shown to the student only; the server prices the checkout itself. */
export function pickTotal(options, pick) {
  const plan = pickedPlan(options, pick);
  if (!plan) return 0;
  const fee = Number(plan.fee) || 0;
  return plan.perCourse ? fee * pickNeed(options, pick) : fee;
}

/** svlPickPlan(): choose a card; courses already ticked are kept up to the new count. */
export function choosePlan(options, pick, cardKey) {
  const [code, countText] = String(cardKey).split(":");
  const next = { ...pick, planCode: code };
  const plan = pickedPlan(options, next);
  const count = countText ? parseInt(countText, 10) : 0;
  next.count = plan ? (code === "CUSTOM" ? Math.min(Math.max(count || plan.minCourses, plan.minCourses), plan.maxCourses) : plan.minCourses) : 0;
  const need = pickNeed(options, next);
  if (need > 0 && options.courses && need === options.courses.length) {
    next.subjectIds = options.courses.map((c) => c.subjectId); // nothing to choose: every course is in it
  } else if (pick.subjectIds.length > need) {
    next.subjectIds = pick.subjectIds.slice(0, need);
  }
  return next;
}

// ---- per-browser memory (last course / video, autoplay); storage may be unavailable ----
const STORE_KEY = "svl.videoLibrary";

export function readStore() {
  try {
    return JSON.parse(window.localStorage.getItem(STORE_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

export function writeStore(patch) {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify({ ...readStore(), ...patch }));
  } catch {
    // private mode / blocked: just don't remember
  }
}
