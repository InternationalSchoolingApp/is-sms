"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Film,
  Gift,
  History,
  Hourglass,
  Lock,
  LockOpen,
  PlayCircle,
  RefreshCw,
  Search,
  Star,
  Volume2,
} from "lucide-react";
import { FullScreenLoader } from "@/components/common/Loader";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PaymentGatewayPickerModal } from "@/components/student-enroll/PaymentGatewayPickerModal";
import { K5VideoLibrary } from "@/components/k5/pages/K5VideoLibrary";
import { SubscribeModal } from "@/components/student/videoLibrary/SubscribeModal";
import { VideoPlayer } from "@/components/student/videoLibrary/VideoPlayer";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useCartCheckout } from "@/hooks/useCartCheckout";
import { isVideoLibrarySuccess, useStudentVideoLibrary } from "@/hooks/useStudentVideoLibrary";
import { startVideoLibraryTrial } from "@/services/videoLibraryApi";
import { resolveBackendOrigin } from "@/utils/backendOrigin";
import {
  PLAN_NAMES,
  buildSteps,
  courseAccess,
  courseKey,
  daysLeft,
  fmtDate,
  fmtTime,
  fullCourseRunning,
  isLocked,
  isPast,
  readStore,
  renewDue,
  restorePosition,
  searchHits,
  stepDone,
  stepPercent,
  thumbUrl,
  trialOnly,
  writeStore,
} from "@/utils/videoLibrary";

const CARD = "rounded-2xl bg-white shadow-[0_6px_20px_rgba(16,42,67,0.06)]";
const PRIMARY_BTN = "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-60";

function Thumb({ video, apiBase, className = "", children }) {
  const src = thumbUrl(video ?? {}, apiBase);
  return (
    <span
      className={`relative flex aspect-video w-24 shrink-0 items-center justify-center overflow-hidden rounded-md bg-slate-900 bg-cover bg-center ${className}`}
      style={src ? { backgroundImage: `url("${src}")` } : undefined}
    >
      {!src && <span className="text-[10px] font-bold tracking-wider text-primary">VIDEO</span>}
      {children}
    </span>
  );
}

function Empty({ title, text, icon: Icon = Film }) {
  return (
    <div className={`${CARD} px-5 py-14 text-center`}>
      <Icon className="mx-auto mb-2 h-12 w-12 text-slate-300" />
      <div className="text-lg font-bold text-slate-600">{title}</div>
      <div className="mt-1 text-sm text-slate-400">{text}</div>
    </div>
  );
}

function UnlockButtons({ access, busy, onTrial, onSubscribe }) {
  if (fullCourseRunning(access)) return null; // nothing can be bought while the Full course runs
  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
      {access?.trialAvailable && access.trialDays > 0 && (
        <button type="button" disabled={busy} onClick={onTrial} className={`${PRIMARY_BTN} bg-emerald-500 hover:bg-emerald-600`}>
          <Gift className="h-4 w-4" /> Start {access.trialDays}-day free trial
        </button>
      )}
      <button type="button" disabled={busy} onClick={onSubscribe} className={`${PRIMARY_BTN} bg-primary`}>
        <LockOpen className="h-4 w-4" /> Subscribe
      </button>
    </div>
  );
}

/** renderStudentAccessBar(): the student's plan(s) and, while something is locked, the trial / subscribe buttons. */
function AccessBar({ access, playlists, busy, onTrial, onSubscribe }) {
  if (!access?.paywall) return null;
  const locked = playlists.filter(isLocked).length;
  const subs = access.subscriptions ?? [];
  if (!subs.length && !locked) return null;
  const line = locked ? (locked === playlists.length ? "Your course videos are locked." : `${locked} of ${playlists.length} courses are locked.`) : "All your courses are open.";
  const single = (label, Icon) => (
    <button type="button" disabled={busy} onClick={onSubscribe} className={`${PRIMARY_BTN} w-full bg-primary sm:w-auto`}>
      <Icon className="h-4 w-4" /> {label}
    </button>
  );

  return (
    <div className={`mb-4 flex flex-wrap items-center gap-3.5 rounded-2xl border-[1.5px] bg-white p-3 sm:p-4 ${locked ? "border-amber-200" : "border-emerald-200"}`}>
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${locked ? "bg-amber-50 text-amber-400" : "bg-emerald-50 text-emerald-500"}`}>
        {locked ? <Lock className="h-5 w-5" /> : <LockOpen className="h-5 w-5" />}
      </div>
      <div className="min-w-[200px] flex-1">
        {subs.length ? (
          <div className="flex flex-wrap gap-2">
            {subs.map((s, i) => {
              const trial = s.planCode === "TRIAL";
              let name = PLAN_NAMES[s.planCode] || "Plan";
              if (s.planCode === "CUSTOM" || s.planCode === "THREE_COURSES") name += ` · ${s.courseCount || 0} course${s.courseCount === 1 ? "" : "s"}`;
              const ends = s.endDate ? (trial ? daysLeft(s.endDate) : `until ${fmtDate(s.endDate)}`) : s.courseEnds ? `until ${fmtDate(s.courseEnds)}` : "until your course ends";
              const Icon = trial ? Hourglass : CheckCircle2;
              return (
                <span
                  key={s.id ?? i}
                  className={`inline-flex flex-wrap items-center gap-1.5 rounded-xl px-3 py-1 text-xs font-extrabold sm:rounded-full ${trial ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}
                >
                  <Icon className="h-3.5 w-3.5" /> {name} <small className="font-semibold opacity-80">{ends}</small>
                </span>
              );
            })}
          </div>
        ) : (
          <div className="text-[15px] font-extrabold text-slate-800">Videos need a subscription</div>
        )}
        <div className="mt-0.5 text-xs text-slate-500">{line}</div>
      </div>
      {locked ? (
        <UnlockButtons access={access} busy={busy} onTrial={onTrial} onSubscribe={onSubscribe} />
      ) : renewDue(access) ? (
        single("Renew", RefreshCw)
      ) : trialOnly(access) ? (
        single("Subscribe", LockOpen)
      ) : null}
    </div>
  );
}

function CourseChips({ playlists, activeIndex, onSelect }) {
  return (
    <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Your courses">
      {playlists.map((detail, i) => {
        const p = detail.playlist ?? {};
        const steps = buildSteps(detail);
        const done = steps.filter(stepDone).length;
        const all = done === steps.length;
        const active = i === activeIndex;
        return (
          <button
            key={courseKey(detail)}
            type="button"
            role="tab"
            aria-selected={active}
            title={`${p.title}${p.locked ? " — locked" : ` — ${done} of ${steps.length} done`}`}
            onClick={() => onSelect(i)}
            className={`inline-flex max-w-full items-center gap-1.5 rounded-full border-[1.5px] py-1.5 pl-4 pr-2 text-xs font-bold transition sm:max-w-[300px] ${
              active
                ? "border-transparent bg-primary text-white shadow-md"
                : `border-slate-200 bg-white hover:border-primary hover:text-primary ${p.locked ? "text-slate-400" : "text-slate-600"}`
            }`}
          >
            <span className="truncate">{p.title}</span>
            {p.standardName && <span className={`whitespace-nowrap text-[10.5px] font-semibold ${active ? "text-white/85" : "text-slate-400"}`}>{p.standardName}</span>}
            <span
              className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-px text-[10.5px] ${
                active ? "bg-white/25 text-white" : p.locked ? "bg-amber-50 text-amber-600" : all ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
              }`}
            >
              {p.locked ? (
                <Lock className="h-3 w-3" />
              ) : (
                <>
                  {all && <Check className="h-3 w-3" />}
                  {done}/{steps.length}
                </>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ModuleHeading({ children }) {
  return <div className="mx-2 mb-1.5 mt-3 text-[11px] font-extrabold uppercase tracking-wide text-primary">{children}</div>;
}

/** renderStudentPlaylistItems(): module headers, one row per lesson (its main video), then other videos. */
function PlaylistItems({ steps, activeStep, apiBase, onPlay }) {
  let lastModule = null;
  let otherHeader = false;
  return steps.map((step, i) => {
    const heading = [];
    if (step.lesson && step.lesson.moduleNo !== lastModule) {
      lastModule = step.lesson.moduleNo;
      heading.push(
        <ModuleHeading key={`m${i}`}>
          Module {lastModule}
          {step.lesson.moduleTitle && <span className="font-semibold normal-case tracking-normal text-slate-400"> — {step.lesson.moduleTitle}</span>}
        </ModuleHeading>,
      );
    }
    if (!step.lesson && !otherHeader) {
      otherHeader = true;
      heading.push(<ModuleHeading key={`o${i}`}>{steps[0].lesson ? "More videos" : "Videos"}</ModuleHeading>);
    }
    const video = step.videos[0];
    const done = stepDone(step);
    const pct = stepPercent(step);
    const active = i === activeStep;
    const title = step.lesson ? step.lesson.title : video.title;
    return [
      ...heading,
      <button
        key={`s${i}`}
        type="button"
        data-step={i}
        aria-current={active ? "true" : undefined}
        aria-label={done ? `Watched: ${title}` : undefined}
        onClick={() => onPlay(i, 0)}
        className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition ${active ? "bg-primary/10" : "hover:bg-slate-50"}`}
      >
        <Thumb video={video} apiBase={apiBase}>
          {active && (
            <span className="absolute inset-0 flex items-center justify-center bg-primary/55 text-white">
              <Volume2 className="h-4 w-4" />
            </span>
          )}
          {done && (
            <span title="Watched" className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400 text-white shadow">
              <Check className="h-3 w-3" />
            </span>
          )}
          {!done && pct > 0 && (
            <span className="absolute inset-x-0 bottom-0 h-1 bg-white/35">
              <span className="block h-full bg-primary" style={{ width: `${pct}%` }} />
            </span>
          )}
        </Thumb>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          {step.lesson && <span className="text-[10.5px] font-extrabold text-primary">L{step.lesson.lessonNo}</span>}
          <span className={`line-clamp-2 text-xs font-bold leading-snug ${active ? "text-primary" : done ? "text-slate-500" : "text-slate-700"}`}>{title}</span>
          {step.videos.length > 1 && <span className="text-[10.5px] font-bold text-amber-600">+{step.videos.length - 1} more</span>}
        </span>
      </button>,
    ];
  });
}

/** renderStudentLockedCourse(): what a locked course holds (titles only) and how to open it. */
function LockedCourse({ detail, access, apiBase, busy, onTrial, onSubscribe }) {
  const p = detail.playlist ?? {};
  const steps = buildSteps(detail);
  const shown = steps.slice(0, 12);
  const noun = steps.length && steps[0].lesson ? "lesson" : "video";
  const course = courseAccess(access, p);
  const text =
    course?.courseEnds && isPast(course.courseEnds)
      ? `This course ended on ${fmtDate(course.courseEnds)}, so its ${noun}s are closed.`
      : fullCourseRunning(access)
        ? "Your Full course plan does not cover this course."
        : `Subscribe to watch its ${steps.length} ${noun}${steps.length === 1 ? "" : "s"}${p.standardName ? ` · ${p.standardName}` : ""}.`;

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className={`${CARD} flex flex-col items-center gap-1.5 px-4 py-7 text-center sm:px-6 sm:py-10`}>
        <div className="mb-1.5 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-400">
          <Lock className="h-7 w-7" />
        </div>
        <div className="text-lg font-extrabold text-slate-800">{p.title || "This course"} is locked</div>
        <div className="mb-2.5 text-sm text-slate-500">{text}</div>
        <UnlockButtons access={access} busy={busy} onTrial={onTrial} onSubscribe={onSubscribe} />
      </div>
      <div className={`${CARD} px-3.5 pb-3.5 pt-1`}>
        {shown.map((step, i) => {
          const heading = step.lesson && step.lesson.moduleNo !== shown[i - 1]?.lesson?.moduleNo ? step.lesson.moduleNo : null;
          return (
            <div key={i}>
              {heading !== null && <ModuleHeading>Module {heading}</ModuleHeading>}
              <div className="flex items-center gap-2 border-b border-dashed border-slate-100 py-1.5 text-xs font-semibold text-slate-500 last:border-b-0">
                <Thumb video={step.videos[0]} apiBase={apiBase}>
                  <span className="absolute inset-0 bg-slate-900/45" />
                  <span className="relative flex h-6 w-6 items-center justify-center rounded-full bg-black/45 text-white">
                    <Lock className="h-3 w-3" />
                  </span>
                </Thumb>
                {step.lesson && <span className="text-[10.5px] font-extrabold text-primary">L{step.lesson.lessonNo}</span>}
                <span>{step.lesson ? step.lesson.title : step.videos[0].title}</span>
              </div>
            </div>
          );
        })}
        {steps.length > shown.length && <div className="pt-2 text-xs font-bold text-slate-400">+ {steps.length - shown.length} more</div>}
      </div>
    </div>
  );
}

function SearchResults({ hits, query, apiBase, onOpen }) {
  if (!hits.length) return <Empty title="No videos found" text={`Nothing matches "${query}" in your courses.`} icon={Search} />;
  return (
    <>
      <div className="mb-2 text-sm font-bold text-slate-500">
        {hits.length} video{hits.length === 1 ? "" : "s"} for &quot;{query}&quot;
      </div>
      <div className={`${CARD} px-2 pb-2.5 pt-1`}>
        {hits.map((hit, i) => {
          const heading = hit.course !== hits[i - 1]?.course ? hit.course : null;
          return (
            <div key={`${hit.p}-${hit.s}-${hit.v}`}>
              {heading !== null && <ModuleHeading>{heading}</ModuleHeading>}
              <button type="button" onClick={() => onOpen(hit)} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-slate-50">
                <Thumb video={hit.video} apiBase={apiBase}>
                  {hit.locked && (
                    <span className="absolute inset-0 flex items-center justify-center bg-slate-900/45 text-white">
                      <Lock className="h-3.5 w-3.5" />
                    </span>
                  )}
                </Thumb>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  {hit.lessonLabel && <span className="text-[10.5px] font-extrabold text-primary">{hit.lessonLabel}</span>}
                  <span className="line-clamp-2 text-xs font-bold text-slate-700">{hit.video.title}</span>
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}

/**
 * The library once the playlists are loaded (remounted after a refetch that should restore the
 * position again, like legacy svlLoadPlaylists -> svlRestoreLastPosition).
 */
function Library({ title, playlists, access, apiBase, applyProgress, busy, onTrial, onSubscribe }) {
  const { isK5 } = useDashboardContext();
  const [pos, setPos] = useState(() => restorePosition(playlists, readStore()));
  const [search, setSearch] = useState("");
  const [autoplay, setAutoplay] = useState(() => readStore().autoplay !== false);
  const [started, setStarted] = useState(false); // the student pressed something -> later videos may autoplay
  const playerRef = useRef(null);
  const sideListRef = useRef(null);
  const stageRef = useRef(null);

  const query = search.trim().toLowerCase();
  const current = playlists[pos.active];
  const steps = buildSteps(current);
  const stepIndex = pos.stepIndex < steps.length ? pos.stepIndex : 0;
  const step = steps[stepIndex];
  const videoIndex = step ? Math.min(pos.videoIndex, step.videos.length - 1) : 0;
  const video = step?.videos[videoIndex];
  const p = current?.playlist ?? {};
  const startAt = pos.resumeAt && video && pos.resumeAt.videoId === video.id ? pos.resumeAt.seconds : 0;
  const locked = isLocked(current);

  // Keep the playing lesson visible inside the sidebar (without scrolling the page).
  useEffect(() => {
    const list = sideListRef.current;
    const item = list?.querySelector('[aria-current="true"]');
    if (!list || !item || list.scrollHeight <= list.clientHeight) return;
    const top = item.offsetTop - list.offsetTop;
    if (top < list.scrollTop || top + item.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = Math.max(0, top - list.clientHeight / 3);
    }
  }, [pos.active, stepIndex]);

  function playStep(nextStep, nextVideo) {
    const target = steps[nextStep];
    if (!target) return;
    setStarted(true);
    setPos({ active: pos.active, stepIndex: nextStep, videoIndex: nextVideo, resumeAt: null });
    writeStore({ course: courseKey(current), videoId: target.videos[Math.min(nextVideo, target.videos.length - 1)].id });
  }

  function selectCourse(index) {
    setSearch("");
    if (index === pos.active && !query) return;
    setPos({ active: index, stepIndex: 0, videoIndex: 0, resumeAt: null });
  }

  function openHit(hit) {
    setSearch("");
    setStarted(true);
    setPos({ active: hit.p, stepIndex: hit.s, videoIndex: hit.v, resumeAt: null });
    requestAnimationFrame(() => stageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function onEnded() {
    if (autoplay && stepIndex < steps.length - 1) playStep(stepIndex + 1, 0);
  }

  function toggleAutoplay(on) {
    setAutoplay(on);
    writeStore({ autoplay: on });
  }

  const done = steps.filter(stepDone).length;
  const pct = steps.length ? Math.round((done * 100) / steps.length) : 0;
  const noun = steps.length && steps[0].lesson ? "lessons" : "videos";

  let main;
  if (!playlists.length) {
    main = <Empty title="No videos yet" text="Videos for your courses will appear here once your teachers add them." />;
  } else if (query) {
    main = <SearchResults hits={searchHits(playlists, query)} query={query} apiBase={apiBase} onOpen={openHit} />;
  } else if (locked) {
    main = <LockedCourse detail={current} access={access} apiBase={apiBase} busy={busy} onTrial={onTrial} onSubscribe={onSubscribe} />;
  } else if (step && video) {
    main = (
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div ref={stageRef} className={`${CARD} scroll-mt-4 overflow-hidden`}>
          <VideoPlayer
            key={`${courseKey(current)}-${video.id}`}
            ref={playerRef}
            video={video}
            autoplay={started}
            startAt={startAt}
            onEnded={onEnded}
            onProgress={applyProgress}
          />
          <div className="px-3.5 pb-4 pt-3 sm:px-4.5">
            <div className="text-xs font-extrabold uppercase tracking-wide text-primary">
              {step.lesson ? `Module ${step.lesson.moduleNo} · Lesson ${step.lesson.lessonNo} — ${step.lesson.title}` : p.title || ""}
            </div>
            <h2 className="mb-2 mt-1 text-base font-extrabold leading-snug text-slate-800 sm:text-lg">{video.title || "Video"}</h2>
            {startAt > 0 && (
              <div className="mb-2.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <History className="h-4 w-4 text-primary" /> Continuing where you left off ({fmtTime(startAt)}) ·
                <button
                  type="button"
                  onClick={() => {
                    setStarted(true);
                    setPos((current) => ({ ...current, resumeAt: null }));
                    playerRef.current?.startOver();
                  }}
                  className="font-bold text-primary underline"
                >
                  Start over
                </button>
              </div>
            )}
            {step.videos.length > 1 && (
              <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-500">Explanations:</span>
                {step.videos.map((v, i) => (
                  <button
                    key={v.id}
                    type="button"
                    title={v.title}
                    onClick={() => playStep(stepIndex, i)}
                    className={`inline-flex items-center gap-1 rounded-full border-[1.5px] px-3 py-1 text-xs font-bold ${
                      i === videoIndex ? "border-primary bg-primary/5 text-primary" : "border-slate-200 bg-white text-slate-500"
                    }`}
                  >
                    {i === 0 ? (
                      <>
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> Main
                      </>
                    ) : (
                      `Video ${i + 1}`
                    )}
                    {v.watchCompleted && <Check className="h-3 w-3 text-emerald-500" aria-label="Watched" />}
                  </button>
                ))}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2.5 border-y border-slate-100 py-2.5">
              <button
                type="button"
                disabled={stepIndex === 0}
                onClick={() => playStep(stepIndex - 1, 0)}
                className="inline-flex items-center gap-1.5 rounded-lg border-[1.5px] border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-600 hover:border-primary hover:text-primary disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:text-slate-600"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              <label className="order-3 flex w-full cursor-pointer select-none items-center gap-2 text-xs font-semibold text-slate-500 sm:order-none sm:w-auto" title="Play the next lesson when this one ends">
                <input type="checkbox" checked={autoplay} onChange={(e) => toggleAutoplay(e.target.checked)} className="peer sr-only" />
                <span className="relative h-[19px] w-[34px] shrink-0 rounded-full bg-slate-300 transition after:absolute after:left-0.5 after:top-0.5 after:h-[15px] after:w-[15px] after:rounded-full after:bg-white after:shadow after:transition-all peer-checked:bg-emerald-400 peer-checked:after:left-[17px] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-primary" />
                Autoplay next
              </label>
              <button
                type="button"
                disabled={stepIndex >= steps.length - 1}
                onClick={() => playStep(stepIndex + 1, 0)}
                className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-bold text-white disabled:opacity-40"
              >
                Next lesson <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            {video.description && <div className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-500">{video.description}</div>}
          </div>
        </div>
        <aside className={`${CARD} overflow-hidden lg:sticky lg:top-3`} aria-label="Course playlist">
          <div className="border-b border-slate-100 px-4 py-3.5">
            <div className="truncate text-[14.5px] font-extrabold text-slate-800" title={p.title || ""}>
              {p.title}
            </div>
            <div className="mt-0.5 text-xs font-semibold text-slate-500">
              {step.lesson ? "Lesson" : "Video"} {stepIndex + 1} of {steps.length}
              {p.standardName ? ` · ${p.standardName}` : ""}
            </div>
            <div className="mt-2">
              <div className="mb-1 flex justify-between text-[11.5px] font-bold text-slate-500">
                <span>
                  {done} of {steps.length} {noun} watched
                </span>
                <span className={done && done === steps.length ? "text-emerald-600" : ""}>{pct}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
                <span className="block h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>
          <div ref={sideListRef} className="min-h-[200px] px-2 pb-2.5 pt-1 lg:max-h-[calc(100vh-210px)] lg:overflow-y-auto">
            <PlaylistItems steps={steps} activeStep={stepIndex} apiBase={apiBase} onPlay={playStep} />
          </div>
        </aside>
      </div>
    );
  }

  if (isK5) {
    return (
      <K5VideoLibrary
        playlists={playlists}
        access={access}
        apiBase={apiBase}
        busy={busy}
        onTrial={onTrial}
        onSubscribe={onSubscribe}
        search={search}
        setSearch={setSearch}
        query={query}
        pos={pos}
        current={current}
        steps={steps}
        stepIndex={stepIndex}
        step={step}
        video={video}
        videoIndex={videoIndex}
        p={p}
        startAt={startAt}
        locked={locked}
        done={done}
        pct={pct}
        noun={noun}
        autoplay={autoplay}
        started={started}
        playStep={playStep}
        selectCourse={selectCourse}
        openHit={openHit}
        onEnded={onEnded}
        onProgress={applyProgress}
        onPlayPressed={() => setStarted(true)}
        onStartOver={() => {
          setStarted(true);
          setPos((c) => ({ ...c, resumeAt: null }));
          playerRef.current?.startOver();
        }}
        toggleAutoplay={toggleAutoplay}
        playerRef={playerRef}
        sideListRef={sideListRef}
        stageRef={stageRef}
      />
    );
  }

  return (
    <>
      <div className="mb-4 rounded-2xl bg-primary px-4 py-5 text-white shadow-lg shadow-primary/25 sm:px-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-13 w-13 items-center justify-center rounded-xl bg-white/20">
            <PlayCircle className="h-7 w-7" />
          </div>
          <div>
            <div className="text-xl font-bold">{title}</div>
            <div className="mt-0.5 text-sm opacity-90">Your course playlists — watch the lessons in order</div>
          </div>
          <div className="relative w-full sm:ml-auto sm:w-auto sm:min-w-[250px]">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search all your videos..."
              aria-label="Search videos"
              className="w-full rounded-full border-0 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 shadow-md outline-none"
            />
          </div>
        </div>
      </div>
      <AccessBar access={access} playlists={playlists} busy={busy} onTrial={onTrial} onSubscribe={onSubscribe} />
      {playlists.length > 0 && <CourseChips playlists={playlists} activeIndex={query ? -1 : pos.active} onSelect={selectCourse} />}
      {main}
    </>
  );
}

/**
 * Video Library (sidebar pageLink student-video-library) — legacy studentVideoLibrary.js +
 * studentVideoLibraryContent.js: one playlist per enrolled course (lessons in order, other teachers'
 * explanations as alternates), an inline player that saves watch progress and moves on to the next
 * lesson, search across all courses, and — when the school's paywall is on — the free trial and the
 * Subscribe modal, whose checkout runs the shared payment-gateway flow (useCartCheckout).
 */
export function VideoLibrary({ title = "Video Library" }) {
  const { context } = useDashboardContext();
  const { userId, schoolUUID } = context ?? {};
  const library = useStudentVideoLibrary(userId);
  const [loadKey, setLoadKey] = useState(0);
  const [subscribing, setSubscribing] = useState(false);
  const [trialBusy, setTrialBusy] = useState(false);
  const checkout = useCartCheckout({
    context,
    onPaid: () => reload("Payment received. Your course videos are open."),
  });
  // A locked course's thumbnail is served by the backend; same origin through the local proxy.
  const origin = process.env.NEXT_PUBLIC_USE_LOCAL_PROXY === "true" ? "" : resolveBackendOrigin();
  const apiBase = `${origin}/${schoolUUID}/api/v1/video-library/`;

  async function reload(message) {
    await library.refetch();
    setLoadKey((k) => k + 1);
    if (message) toast.success(message);
  }

  async function startTrial() {
    if (trialBusy) return;
    setTrialBusy(true);
    try {
      const response = await startVideoLibraryTrial();
      if (isVideoLibrarySuccess(response)) {
        await reload("Your free trial has started — enjoy all your course videos!");
      } else {
        toast.error(response?.message || "The trial could not be started.");
      }
    } catch {
      toast.error("The trial could not be started.");
    } finally {
      setTrialBusy(false);
    }
  }

  const data = library.data;
  let content;
  if (!context || library.isLoading) {
    content = <p className="py-10 text-center text-lg font-bold text-primary">Loading…</p>;
  } else if (!data?.ok) {
    content = <Empty title="Videos could not be loaded" text="Please refresh the page and try again." icon={AlertCircle} />;
  } else {
    content = (
      <Library
        key={loadKey}
        title={title}
        playlists={data.playlists}
        access={data.access}
        apiBase={apiBase}
        applyProgress={library.applyProgress}
        busy={trialBusy || checkout.preparing}
        onTrial={startTrial}
        onSubscribe={() => setSubscribing(true)}
      />
    );
  }

  return (
    <div className="mx-auto w-full pb-8">
      {content}

      {subscribing && (
        <SubscribeModal
          onClose={() => setSubscribing(false)}
          onCheckout={(userPaymentDetailsId) => {
            setSubscribing(false);
            checkout.start(userPaymentDetailsId); // the dashboard's gateway chooser (legacy checkPayment)
          }}
        />
      )}
      {context && (
        <PaymentGatewayPickerModal
          open={Boolean(checkout.picker)}
          onOpenChange={(open) => !open && checkout.closePicker()}
          details={checkout.picker?.details}
          airwallexMethods={checkout.picker?.methods}
          payerCountryCode={checkout.picker?.countryCode}
          schoolNumericId={context.schoolNumericId}
          schoolName={context.schoolName}
          busy={checkout.launching}
          onPay={checkout.launchGateway}
          onUploadProof={checkout.uploadProof}
          onSubmitOffline={checkout.submitOffline}
        />
      )}
      {(trialBusy || checkout.preparing || checkout.processing) && (
        <FullScreenLoader message={checkout.processing ? "Payment is under process..." : undefined} />
      )}
      <Dialog open={checkout.incomplete} onOpenChange={(open) => !open && checkout.dismissIncomplete()}>
        <DialogContent className="text-center">
          <DialogHeader>
            <DialogTitle className="text-2xl">Oops!</DialogTitle>
          </DialogHeader>
          <h3 className="text-lg font-semibold text-red-600">Payment Incomplete</h3>
        </DialogContent>
      </Dialog>
      <Dialog
        open={checkout.underReview}
        onOpenChange={(open) => {
          if (open) return;
          checkout.dismissUnderReview();
          reload();
        }}
      >
        <DialogContent className="text-center">
          <DialogHeader>
            <DialogTitle>Your payment is under review.</DialogTitle>
          </DialogHeader>
          <p className="text-black/70">Your course videos will open once the payment is received.</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
