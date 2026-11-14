"use client";

import { Check, CheckCircle2, ChevronLeft, ChevronRight, Gift, Hourglass, Lock, LockOpen, Play, RefreshCw, Search } from "lucide-react";
import { K5_CARD } from "@/components/k5/home/k5Bits";
import { usePicoContentReady } from "@/components/k5/pico/picoEvents";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { VideoPlayer } from "@/components/student/videoLibrary/VideoPlayer";
import { useK5CourseColors } from "@/hooks/useK5CourseColors";
import { subjectStyle } from "@/utils/k5Calendar";
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
  renewDue,
  searchHits,
  stepDone,
  thumbUrl,
  trialOnly,
} from "@/utils/videoLibrary";

const PILL_BUTTON =
  "flex min-h-[48px] cursor-pointer items-center gap-2 rounded-full border-[3px] border-k5-line bg-k5-card px-[18px] font-k5-display text-[17px] font-semibold text-k5-ink shadow-[0_4px_0_var(--k5-line)] disabled:cursor-default disabled:opacity-45";
const PRIMARY_BUTTON = "flex min-h-[48px] cursor-pointer items-center gap-2 rounded-full border-[3px] border-k5-ac bg-k5-ac px-[18px] font-k5-display text-[17px] font-semibold text-white shadow-[0_4px_0_var(--k5-acd)] disabled:cursor-default disabled:opacity-60";
const tint = (color) => `color-mix(in srgb, ${color} 14%, white)`;

function useCourseColor() {
  const colorFor = useK5CourseColors();
  return (title) => colorFor({ name: title }) || subjectStyle(title).color;
}

/** The access strip: the plan(s) and, while something is locked, the trial / subscribe buttons (mockup trial bar). */
function AccessBar({ access, playlists, busy, onTrial, onSubscribe }) {
  if (!access?.paywall) return null;
  const locked = playlists.filter(isLocked).length;
  const subs = access.subscriptions ?? [];
  if (!subs.length && !locked) return null;
  const line = locked ? (locked === playlists.length ? "Your course videos are locked." : `${locked} of ${playlists.length} courses are locked.`) : "All your courses are open.";
  const subscribeButton = (label, Icon) => (
    <button type="button" disabled={busy} onClick={onSubscribe} className={`${PRIMARY_BUTTON} max-[760px]:w-full max-[760px]:justify-center`}>
      <Icon className="h-[18px] w-[18px]" strokeWidth={2.6} aria-hidden="true" /> {label}
    </button>
  );
  let action = null;
  if (locked) {
    if (!fullCourseRunning(access)) {
      action = (
        <div className="flex gap-2.5 max-[760px]:w-full max-[760px]:flex-col">
          {access?.trialAvailable && access.trialDays > 0 && (
            <button type="button" disabled={busy} onClick={onTrial} className={`${PILL_BUTTON} justify-center bg-k5-gt text-k5-gx`}>
              <Gift className="h-[18px] w-[18px]" strokeWidth={2.6} aria-hidden="true" /> Start {access.trialDays}-day free trial
            </button>
          )}
          {subscribeButton("Subscribe", LockOpen)}
        </div>
      );
    }
  } else if (renewDue(access)) action = subscribeButton("Renew", RefreshCw);
  else if (trialOnly(access)) action = subscribeButton("Subscribe", LockOpen);

  return (
    <div
      className="k5h-lb-access flex flex-wrap items-center gap-3.5 rounded-3xl border-[3px] bg-k5-card px-[18px] py-3.5"
      style={{ borderColor: locked ? "var(--k5-yB)" : "var(--k5-ac)", boxShadow: `0 5px 0 ${locked ? "var(--k5-yT)" : "var(--k5-act)"}` }}
    >
      <span aria-hidden="true" className={`flex h-14 w-14 flex-none items-center justify-center rounded-[18px] ${locked ? "bg-k5-yt text-k5-yi" : "bg-k5-act text-k5-acx"}`}>
        {locked ? <Lock className="h-7 w-7" strokeWidth={2.4} /> : <LockOpen className="h-7 w-7" strokeWidth={2.4} />}
      </span>
      <div className="flex min-w-[240px] flex-[1_1_240px] flex-col gap-1 max-[760px]:min-w-0">
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
                  className={`inline-flex flex-wrap items-center gap-2 rounded-full border-2 px-3 py-[3px] text-[15px] font-black ${trial ? "border-k5-yb bg-k5-yt text-k5-yx" : "border-k5-gi bg-k5-gt text-k5-gx"}`}
                >
                  <Icon className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" /> {name} <span className="text-[13px] font-extrabold">{ends}</span>
                </span>
              );
            })}
          </div>
        ) : (
          <span className="font-k5-display text-lg font-semibold">Videos need a subscription</span>
        )}
        <span className="text-base font-extrabold text-k5-mut">{line}</span>
      </div>
      {action}
    </div>
  );
}

function CourseChips({ playlists, activeIndex, onSelect }) {
  const colorOf = useCourseColor();
  return (
    <div role="tablist" aria-label="Your courses" className="flex flex-wrap gap-2.5">
      {playlists.map((detail, i) => {
        const p = detail.playlist ?? {};
        const steps = buildSteps(detail);
        const done = steps.filter(stepDone).length;
        const active = i === activeIndex;
        const color = colorOf(p.title);
        return (
          <button
            key={courseKey(detail)}
            type="button"
            role="tab"
            aria-selected={active}
            title={`${p.title}${p.locked ? " — locked" : ` — ${done} of ${steps.length} done`}`}
            onClick={() => onSelect(i)}
            className="k5h-lb-chip flex min-h-[52px] cursor-pointer items-center gap-2.5 rounded-full border-[3px] py-0 pe-2.5 ps-4 font-k5-display text-[17px] font-semibold max-[760px]:basis-full max-[760px]:text-base"
            style={{ background: active ? "var(--k5-ac)" : "var(--k5-card)", borderColor: active ? "var(--k5-ac)" : "var(--k5-line)", color: active ? "#FFFFFF" : "var(--k5-ink)", boxShadow: `0 4px 0 ${active ? "var(--k5-acd)" : "var(--k5-line)"}` }}
          >
            <span aria-hidden="true" className="h-3.5 w-3.5 flex-none rounded-full" style={{ background: active ? "#FFFFFF" : color }} />
            <span className="min-w-0 truncate">{p.title}</span>
            {p.standardName && <span className="font-k5-body text-sm font-extrabold opacity-85">{p.standardName}</span>}
            <span className="flex items-center gap-1 rounded-full px-2.5 py-px font-k5-body text-sm font-black" style={{ background: active ? "rgba(255,255,255,0.28)" : "var(--k5-soft)", color: active ? "#FFFFFF" : "var(--k5-ink)" }}>
              {p.locked ? <Lock className="h-3.5 w-3.5" aria-hidden="true" /> : done === steps.length && steps.length > 0 && <Check className="h-3.5 w-3.5" strokeWidth={3.2} aria-hidden="true" />}
              {!p.locked && `${done}/${steps.length}`}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** A list row of the side panel: the video's own YouTube picture, its lesson tag and title. */
function Row({ video, apiBase, color, active, tag, title, seen, locked, onClick }) {
  const src = thumbUrl(video ?? {}, apiBase);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "true" : undefined}
      aria-label={seen ? `Watched: ${title}` : undefined}
      className="flex w-full cursor-pointer items-center gap-3 rounded-[18px] border-[3px] p-2 text-start hover:!border-k5-ac"
      style={{ background: active ? "var(--k5-act)" : "var(--k5-card)", borderColor: active ? "var(--k5-ac)" : "var(--k5-line)" }}
    >
      <span
        aria-hidden="true"
        className="k5h-lb-mini relative flex aspect-[16/10] w-24 flex-none items-center justify-center overflow-hidden rounded-xl bg-cover bg-center"
        style={{ background: src ? `center / cover no-repeat url("${src}")` : tint(color), color }}
      >
        <span className={`flex h-[26px] w-[26px] items-center justify-center rounded-full bg-k5-card ${locked ? "text-k5-mut" : ""}`}>
          {locked ? <Lock className="h-3.5 w-3.5" aria-hidden="true" /> : <Play className="h-3.5 w-3.5" fill="currentColor" strokeWidth={0} aria-hidden="true" />}
        </span>
      </span>
      <span className="flex min-w-0 flex-[1_1_auto] flex-col gap-0.5">
        {tag && <span className="text-[13px] font-black text-k5-acx">{tag}</span>}
        <span className={`line-clamp-2 text-base font-black leading-tight ${active ? "text-k5-acx" : "text-k5-ink"}`}>{title}</span>
      </span>
      {seen && (
        <span role="img" aria-label="Watched" className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-k5-grn text-white">
          <Check className="h-4 w-4" strokeWidth={3.2} aria-hidden="true" />
        </span>
      )}
    </button>
  );
}

function ModuleHeading({ children }) {
  return <span className="mt-1 text-sm font-black uppercase tracking-[0.08em] text-k5-acx">{children}</span>;
}

/** The video area: YouTube's own picture with the big play button, then the real player. */
function Stage({ video, step, p, color, apiBase, playing, startAt, playerRef, onEnded, onProgress, onPlay }) {
  const src = thumbUrl(video, apiBase);
  const title = video.title || "Video";
  const live = /\blive\b/i.test(title);

  return (
    <>
      {playing ? (
        <VideoPlayer ref={playerRef} video={video} autoplay startAt={startAt} onEnded={onEnded} onProgress={onProgress} />
      ) : (
        <div className="relative aspect-video w-full overflow-hidden" style={{ background: tint(color) }}>
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <>
              <span aria-hidden="true" className="absolute -end-[90px] -top-[110px] h-[340px] w-[340px] rounded-full opacity-[0.14]" style={{ background: color }} />
              <span aria-hidden="true" className="absolute -bottom-[70px] -start-[60px] h-[180px] w-[180px] rounded-full opacity-[0.12]" style={{ background: color }} />
              <span className="absolute start-[7%] top-[26%] max-w-[88%] font-k5-display text-[clamp(26px,5vw,56px)] font-bold uppercase leading-none tracking-[0.02em] min-[761px]:max-w-[60%]" style={{ color }}>
                {step.lesson ? p.title : title}
              </span>
            </>
          )}
          <div className="absolute inset-x-0 top-0 flex items-center gap-2.5 bg-gradient-to-b from-[rgba(10,16,34,0.55)] to-transparent px-[18px] py-3.5 text-base font-black leading-[1.3] text-white">
            {live && <span className="flex-none rounded-lg bg-[#D7263D] px-2.5 py-0.5 text-xs tracking-[0.06em]">LIVE</span>}
            <span className="overflow-hidden text-ellipsis whitespace-nowrap max-[760px]:whitespace-normal max-[760px]:text-[13px]">{title}</span>
          </div>
          {(
            <button type="button" onClick={onPlay} aria-label="Play lesson" className="k5-lbplay absolute left-1/2 top-1/2 flex h-[92px] w-[92px] -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-[5px] border-white bg-k5-ac p-0 ps-1.5 text-white shadow-[0_8px_0_var(--k5-acd),0_10px_30px_rgba(10,16,34,0.25)] hover:scale-[1.06] max-[760px]:h-[72px] max-[760px]:w-[72px]">
              <Play className="h-11 w-11" fill="currentColor" strokeWidth={0} aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </>
  );
}

/**
 * K–5 look of the Video Library (mockup Videos): header with search, the plan strip, course chips, then the
 * video with its lesson list. All data and behaviour come from the existing library (progress, resume,
 * autoplay, trial, subscribe); the picture before play is the video's own YouTube thumbnail.
 */
export function K5VideoLibrary(props) {
  const {
    playlists, access, apiBase, busy, onTrial, onSubscribe, search, setSearch, query, pos, current, steps, stepIndex, step, video, videoIndex,
    p, startAt, locked, done, pct, noun, autoplay, started, playStep, selectCourse, openHit, onEnded, onProgress, onStartOver, onPlayPressed,
    toggleAutoplay, playerRef, sideListRef, stageRef,
  } = props;
  const colorOf = useCourseColor();
  const { isMiddle } = useDashboardContext();
  usePicoContentReady(true);
  const color = colorOf(p.title);
  const hits = query ? searchHits(playlists, query) : [];

  return (
    <div className="flex flex-col gap-[18px]">
      {/* Grade 6–8 / 9–12 (Middle / High.dc.html): no card around the title, a 62px accent tile, a 30px heading, 16px subtitle. */}
      <div className={isMiddle ? "flex flex-wrap items-center gap-4" : `${K5_CARD} flex flex-wrap items-center gap-4 px-[22px] py-[18px]`}>
        <span aria-hidden="true" className={isMiddle ? "k5h-lb-tile flex h-[62px] w-[62px] flex-none items-center justify-center rounded-[14px] bg-k5-act text-k5-ink" : "flex h-[76px] w-[76px] flex-none items-center justify-center rounded-3xl bg-k5-ot text-k5-oi"}>
          <svg width={isMiddle ? 34 : 42} height={isMiddle ? 34 : 42} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="14" rx="3" />
            <path d="M10 9.2v5.6l4.8-2.8z" />
          </svg>
        </span>
        <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1">
          <h1 className={`m-0 font-k5-display font-semibold leading-[1.05] ${isMiddle ? "text-[30px]" : "text-4xl"}`}>Videos</h1>
          <p className={`m-0 font-extrabold text-k5-mut ${isMiddle ? "text-base" : "text-lg"}`}>Your course playlists — watch the lessons in order</p>
        </div>
        <label className="flex min-h-[52px] min-w-0 flex-[0_1_340px] items-center gap-2.5 rounded-full border-[3px] border-k5-line bg-k5-soft px-4 max-[760px]:flex-[1_1_100%]">
          <Search className="h-5 w-5 flex-none text-k5-mut" strokeWidth={3} aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search all your videos..."
            aria-label="Search all your videos..."
            className="min-w-0 flex-[1_1_auto] border-none bg-transparent text-base font-extrabold text-k5-ink outline-none"
          />
        </label>
      </div>

      <AccessBar access={access} playlists={playlists} busy={busy} onTrial={onTrial} onSubscribe={onSubscribe} />
      {playlists.length > 0 && <CourseChips playlists={playlists} activeIndex={query ? -1 : pos.active} onSelect={selectCourse} />}

      {!playlists.length ? (
        <div className={`${K5_CARD} p-8 text-center font-k5-display text-2xl font-semibold text-k5-mut`}>No videos yet · Videos for your courses will appear here once your teachers add them.</div>
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)_360px] items-start gap-[18px] max-[1100px]:grid-cols-1">
          <section ref={stageRef} className={`${K5_CARD} flex min-w-0 scroll-mt-4 flex-col overflow-hidden`}>
            {locked || !step || !video ? (
              <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
                <span className="mb-1 flex h-16 w-16 items-center justify-center rounded-full bg-k5-yt text-k5-yi">
                  <Lock className="h-7 w-7" strokeWidth={2.4} aria-hidden="true" />
                </span>
                <h2 className="m-0 font-k5-display text-[26px] font-semibold">{p.title || "This course"} is locked</h2>
                <p className="m-0 text-base font-extrabold text-k5-mut">
                  {(() => {
                    const course = courseAccess(access, p);
                    const noun1 = steps.length && steps[0].lesson ? "lesson" : "video";
                    if (course?.courseEnds && isPast(course.courseEnds)) return `This course ended on ${fmtDate(course.courseEnds)}, so its ${noun1}s are closed.`;
                    if (fullCourseRunning(access)) return "Your Full course plan does not cover this course.";
                    return `Subscribe to watch its ${steps.length} ${noun1}${steps.length === 1 ? "" : "s"}${p.standardName ? ` · ${p.standardName}` : ""}.`;
                  })()}
                </p>
                {!fullCourseRunning(access) && (
                  <div className="mt-2 flex flex-wrap justify-center gap-2.5">
                    {access?.trialAvailable && access.trialDays > 0 && (
                      <button type="button" disabled={busy} onClick={onTrial} className={`${PILL_BUTTON} bg-k5-gt text-k5-gx`}>
                        <Gift className="h-[18px] w-[18px]" strokeWidth={2.6} aria-hidden="true" /> Start {access.trialDays}-day free trial
                      </button>
                    )}
                    <button type="button" disabled={busy} onClick={onSubscribe} className={PRIMARY_BUTTON}>
                      <LockOpen className="h-[18px] w-[18px]" strokeWidth={2.6} aria-hidden="true" /> Subscribe
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Stage
                  key={`${courseKey(current)}-${video.id}`}
                  video={video}
                  step={step}
                  p={p}
                  color={color}
                  apiBase={apiBase}
                  playing={started}
                  startAt={startAt}
                  playerRef={playerRef}
                  onEnded={onEnded}
                  onProgress={onProgress}
                  onPlay={onPlayPressed}
                />
                <div className="flex flex-col gap-3 px-[22px] pb-5 pt-[18px] max-[760px]:px-4">
                  <span className="text-sm font-black uppercase tracking-[0.06em] text-k5-acx">
                    {step.lesson ? `Module ${step.lesson.moduleNo} · Lesson ${step.lesson.lessonNo} — ${step.lesson.title}` : p.title || ""}
                  </span>
                  <h2 className="m-0 font-k5-display text-[26px] font-semibold leading-[1.2] max-[760px]:text-[22px]">{video.title || "Video"}</h2>
                  {startAt > 0 && (
                    <div className="flex flex-wrap items-center gap-2 text-base font-extrabold text-k5-mut">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-k5-acx">
                        <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                        <path d="M3 3v5h5" />
                        <path d="M12 8v4l3 2" />
                      </svg>
                      Continuing where you left off ({fmtTime(startAt)}) ·
                      <button type="button" onClick={onStartOver} className="cursor-pointer border-none bg-transparent p-0 font-black text-k5-acx underline">
                        Start over
                      </button>
                    </div>
                  )}
                  {step.videos.length > 1 && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-extrabold text-k5-mut">Explanations:</span>
                      {step.videos.map((v, i) => (
                        <button
                          key={v.id}
                          type="button"
                          title={v.title}
                          onClick={() => playStep(stepIndex, i)}
                          className={`flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border-[3px] px-3.5 text-[15px] font-black text-k5-ink ${i === videoIndex ? "border-k5-ac bg-k5-act" : "border-k5-line bg-k5-card"}`}
                        >
                          {i === 0 ? "★ Main" : `Video ${i + 1}`}
                          {v.watchCompleted && <Check className="h-4 w-4 text-k5-grn" strokeWidth={3.2} aria-label="Watched" />}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-3 border-y-[3px] border-k5-line py-3.5">
                    <button type="button" disabled={stepIndex === 0} onClick={() => playStep(stepIndex - 1, 0)} className={`${PILL_BUTTON} ps-3`}>
                      <ChevronLeft className="h-5 w-5" strokeWidth={3} aria-hidden="true" /> Previous
                    </button>
                    <label className="flex min-h-[48px] cursor-pointer select-none items-center gap-2.5 px-1.5 text-base font-black max-[760px]:order-3 max-[760px]:w-full">
                      <input type="checkbox" role="switch" checked={autoplay} onChange={(e) => toggleAutoplay(e.target.checked)} className="peer sr-only" />
                      <span className="relative block h-[30px] w-[52px] flex-none rounded-full bg-k5-line transition-colors after:absolute after:start-1 after:top-1 after:h-[22px] after:w-[22px] after:rounded-full after:bg-white after:shadow after:transition-all peer-checked:bg-k5-grn peer-checked:after:start-[26px] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-k5-ac" />
                      Autoplay next
                    </label>
                    <button type="button" disabled={stepIndex >= steps.length - 1} onClick={() => playStep(stepIndex + 1, 0)} className={`${PRIMARY_BUTTON} ms-auto pe-3 max-[760px]:ms-0`}>
                      Next lesson <ChevronRight className="h-5 w-5" strokeWidth={3} aria-hidden="true" />
                    </button>
                  </div>
                  {video.description && <p className="m-0 whitespace-pre-line text-[17px] font-extrabold leading-normal text-k5-mut">{video.description}</p>}
                </div>
              </>
            )}
          </section>

          <aside aria-label="Course playlist" className={`${K5_CARD} flex flex-col gap-3.5 self-start p-[18px]`}>
            {query ? (
              <>
                <b className="font-k5-display text-xl font-semibold">Results</b>
                {hits.length ? (
                  <div className="flex flex-col gap-2">
                    {hits.map((hit) => (
                      <Row
                        key={`${hit.p}-${hit.s}-${hit.v}`}
                        video={hit.video}
                        apiBase={apiBase}
                        color={colorOf(hit.course)}
                        tag={hit.lessonLabel || hit.course}
                        title={hit.video.title}
                        seen={hit.video.watchCompleted}
                        locked={hit.locked}
                        onClick={() => openHit(hit)}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="m-0 px-2 py-[18px] text-center text-base font-extrabold text-k5-mut">No videos found.</p>
                )}
              </>
            ) : (
              <>
                {steps.length > 0 && (
                  <div className="flex flex-col gap-1.5 border-b-[3px] border-k5-line pb-3.5">
                    <b className="font-k5-display text-[22px] font-semibold">{p.title}</b>
                    <span className="text-[15px] font-extrabold text-k5-mut">
                      {locked ? `${steps.length} ${noun}` : `${step?.lesson ? "Lesson" : "Video"} ${stepIndex + 1} of ${steps.length}`}
                      {p.standardName ? ` · ${p.standardName}` : ""}
                    </span>
                    {!locked && (
                      <>
                        <div className="mt-1 flex justify-between text-[15px] font-black">
                          <span>{done} of {steps.length} {noun} watched</span>
                          <span>{pct}%</span>
                        </div>
                        <span role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className="block h-3 overflow-hidden rounded-full border-2 border-k5-line bg-k5-soft">
                          <span className="block h-full rounded-full bg-k5-grn transition-[width] duration-[400ms]" style={{ width: `${pct}%` }} />
                        </span>
                      </>
                    )}
                  </div>
                )}
                <div ref={sideListRef} className="flex max-h-[calc(100vh-210px)] flex-col gap-2 overflow-y-auto max-[1100px]:max-h-none">
                  {steps.map((s, i) => {
                    // A module heading before its first lesson; one "More videos" heading before the extra videos.
                    const prev = steps[i - 1];
                    const heading = [];
                    if (s.lesson && (!prev || prev.lesson?.moduleNo !== s.lesson.moduleNo)) {
                      heading.push(
                        <ModuleHeading key={`m${i}`}>
                          Module {s.lesson.moduleNo}
                          {s.lesson.moduleTitle && <span className="font-extrabold normal-case tracking-normal text-k5-mut"> — {s.lesson.moduleTitle}</span>}
                        </ModuleHeading>,
                      );
                    }
                    if (!s.lesson && (!prev || prev.lesson)) {
                      heading.push(<ModuleHeading key={`o${i}`}>{steps[0].lesson ? "More videos" : "Videos"}</ModuleHeading>);
                    }
                    const v = s.videos[0];
                    return [
                      ...heading,
                      <Row
                        key={`s${i}`}
                        video={v}
                        apiBase={apiBase}
                        color={color}
                        active={!locked && i === stepIndex}
                        tag={s.lesson ? `Lesson ${s.lesson.lessonNo}` : null}
                        title={s.lesson ? s.lesson.title : v.title}
                        seen={!locked && stepDone(s)}
                        locked={locked}
                        onClick={() => !locked && playStep(i, 0)}
                      />,
                    ];
                  })}
                </div>
              </>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
