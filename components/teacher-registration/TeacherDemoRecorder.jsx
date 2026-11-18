"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Copy, Info, Loader2, Play, RefreshCw, Video } from "lucide-react";
import toast from "react-hot-toast";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TeacherDemoRecordingViewer } from "@/components/teacher-registration/TeacherDemoRecordingViewer";
import { useDiscardTeacherDemoAttempt, useStartTeacherDemo } from "@/hooks/useTeacherDemoRecorder";
import {
  DEMO_STATE,
  DEMO_STATE_LABELS,
  demoRecordButtonLabel,
  formatDemoDateTime,
  isPendingDemoState,
  readyDemoAttempts,
} from "@/utils/teacherDemoRecording";

const GUIDELINES = [
  "Find a quiet, well-lit place, free from any kind of distraction.",
  "You need a stable internet connection.",
  "Check that your computer's audio and webcam are working fine.",
  "Dress professionally and keep the right posture and body language.",
  "The medium of instruction must be English.",
];

const CRITERIA = ["Content Knowledge", "Voice Modulation", "Presentation & Confidence", "Engagement Strategies", "Technical Efficiency"];

// The meeting opens in its own tab by itself (as in the legacy wizard); the "Start Demo" link of the dialog is the
// fallback for a browser that blocks the tab. The host link is only shown as text outside production (legacy:
// DEPLOYMENT_MODE != "PROD"), where testers need to copy it by hand.
const SHOW_HOST_LINK_TEXT = process.env.NEXT_PUBLIC_DEPLOYMENT_MODE !== "PROD";

// What the new tab shows for the few seconds until the host link is ready (the tab has to be opened inside the click,
// the link only exists a moment later). Plain static markup: no script, nothing from the server.
const MEETING_TAB_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Starting your demo meeting…</title>
<style>
  html,body{height:100%;margin:0}
  body{display:flex;align-items:center;justify-content:center;background:#f1f5f9;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#0f172a}
  .card{width:min(92vw,420px);background:#fff;border-radius:16px;padding:36px 28px;text-align:center;box-shadow:0 10px 30px rgba(15,23,42,.08)}
  .spinner{width:44px;height:44px;margin:0 auto 20px;border:4px solid #dbeafe;border-top-color:#027fff;border-radius:50%;animation:spin 0.9s linear infinite}
  h1{font-size:20px;margin:0 0 8px}
  p{font-size:14px;line-height:1.5;color:#475569;margin:0}
  @keyframes spin{to{transform:rotate(360deg)}}
  @media (prefers-reduced-motion:reduce){.spinner{animation:none}}
</style></head>
<body><div class="card" role="status"><div class="spinner"></div>
<h1>Starting your demo meeting</h1>
<p>Your meeting is being set up. This tab will open it automatically in a moment, please keep it open.</p></div></body></html>`;

function openMeetingTab() {
  try {
    const tab = window.open("", "_blank");
    if (!tab) return null;
    tab.opener = null; // this page stays out of reach of whatever the new tab becomes
    tab.document.open();
    tab.document.write(MEETING_TAB_HTML);
    tab.document.close(); // finished, so the tab does not look like it is still loading
    return tab;
  } catch {
    return null;
  }
}

function sendTabToMeeting(tab, hostUrl) {
  if (!tab || tab.closed) return false;
  try {
    tab.location.href = hostUrl;
    return true;
  } catch {
    return false;
  }
}

function closeTab(tab) {
  try {
    tab?.close();
  } catch {
    // already gone
  }
}

function StateBadge({ state }) {
  const tone =
    state === DEMO_STATE.READY
      ? "bg-emerald-50 text-emerald-700"
      : state === DEMO_STATE.INVALID || state === DEMO_STATE.TOO_SHORT
        ? "bg-red-50 text-red-600"
        : "bg-amber-50 text-amber-700";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${tone}`}>
      {isPendingDemoState(state) && <Loader2 className="h-3 w-3 animate-spin" />}
      {DEMO_STATE_LABELS[state]}
    </span>
  );
}

/**
 * The live demo recorder of Step 2 (a teacher who has no saved demo link): a button with a status line, and a drawer with
 * the instructions, the attempts and what to do with each. The server decides what each attempt is and how many are
 * used (utils/teacherDemoRecording.js only maps it), so this component only shows it.
 *
 *   demo:        useTeacherDemoRecordings() of the parent (the same data the parent validates the choice against)
 *   chosenId:    the chosen recording's Lens meeting id, "" = none   onChoose(meetingId)
 *   onSaveFirst(): validates and saves the form, resolves true when the recorder may open (the parent shows what is missing);
 *     false = the form is incomplete, a string = the server refused the save and that is why
 *   busy:        the form is saving or uploading, so recording must wait
 */
export function TeacherDemoRecorder({ context, userId, demo, chosenId, onChoose, onSaveFirst, onSessionOut, busy, error }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [opening, setOpening] = useState(false); // saving the form before the drawer opens
  const [hostLink, setHostLink] = useState(null); // { hostUrl, title } while the "Start Demo" dialog is open
  const [playing, setPlaying] = useState(null); // an attempt whose recordings are open
  const [redoingId, setRedoingId] = useState(null); // the attempt being removed and redone
  const [confirmRedo, setConfirmRedo] = useState(null); // a finished attempt waiting for "yes, remove it"
  const [startError, setStartError] = useState("");
  const startingRef = useRef(false);

  const startDemo = useStartTeacherDemo({ context, userId });
  const discard = useDiscardTeacherDemoAttempt({ context });

  const data = demo.data;
  const attempts = data?.attempts ?? [];
  const chosenAttempt = attempts.find((attempt) => attempt.state === DEMO_STATE.READY && attempt.meetingId === chosenId);
  const readyCount = readyDemoAttempts(attempts).length;
  const starting = startDemo.isPending || discard.isPending;

  // A new meeting, or (the legacy "Re-attempt") `redo` = an attempt to remove first and replace with a new meeting, in
  // one click. Either way the meeting opens in a tab that is opened right here, inside the click.
  async function startAttempt(redo = null) {
    if (startingRef.current || busy) return;
    startingRef.current = true;
    setStartError("");
    setRedoingId(redo ? redo.id : null);
    // Opened now, inside the click: a tab opened after the awaits below would be taken for a pop-up and blocked.
    const meetingTab = openMeetingTab();
    let tabInUse = false;
    try {
      let known = attempts.length;
      if (redo) {
        if (!(await discard.mutateAsync(redo.id))) {
          setStartError("We couldn't remove this attempt. Please try again.");
          return;
        }
        known -= 1;
      }
      const result = await startDemo.mutateAsync({ reattempt: Boolean(redo) });
      if (result.sessionOut) {
        onSessionOut?.();
        return;
      }
      if (!result.ok) {
        setStartError(result.message);
        return;
      }
      if (!result.reused) demo.watch(known);
      tabInUse = sendTabToMeeting(meetingTab, result.hostUrl);
      setHostLink({ hostUrl: result.hostUrl, title: result.title });
    } catch (err) {
      console.error("TeacherDemoRecorder start failed:", err);
      setStartError("Something went wrong. Please try again.");
    } finally {
      if (!tabInUse) closeTab(meetingTab);
      if (redo) demo.refetch(); // the removed attempt leaves the list now, not at the next poll
      setRedoingId(null);
      startingRef.current = false;
    }
  }

  function handleRecord() {
    return startAttempt();
  }

  // A failed attempt is redone at once (legacy); a finished one is a good recording, so ask before removing it.
  function handleReattempt(attempt) {
    if (attempt.state === DEMO_STATE.READY) setConfirmRedo(attempt);
    else startAttempt(attempt);
  }

  // The legacy order: the button opens the recorder only once the form above is complete AND saved (the recording
  // takes a while, so the teacher's details must already be safe); the form shows what is missing.
  async function handleOpen() {
    if (opening || busy) return;
    setOpening(true);
    try {
      const saved = await onSaveFirst();
      if (saved === true) setDrawerOpen(true);
      else toast.error(typeof saved === "string" ? saved : "Please complete the highlighted details first.");
    } catch (err) {
      console.error("TeacherDemoRecorder save before opening failed:", err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setOpening(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(hostLink.hostUrl);
      toast.success("Link copied.");
    } catch {
      toast.error("Couldn't copy the link. Please copy it from the address bar after opening it.");
    }
  }

  let status = null;
  if (demo.isPending) status = "Checking your demo attempts…";
  else if (demo.isError) status = null;
  else if (chosenAttempt) status = `Chosen: ${chosenAttempt.label}${chosenAttempt.duration ? ` (${chosenAttempt.duration})` : ""}`;
  else if (readyCount > 0) status = "Your recording is ready — open the demo window and choose the one to submit.";
  else if (attempts.some((attempt) => isPendingDemoState(attempt.state))) status = "Your recording is being prepared…";
  else if (data) status = `Attempts used: ${data.attemptsUsed} of ${data.maxAttempts}`;

  return (
    <div className="mt-5 flex flex-col items-center gap-2 rounded-lg border border-slate-200 p-4 text-center">
      <h3 className="text-base font-bold text-black">Record Your Demo</h3>
      <Button
        type="button"
        onClick={handleOpen}
        disabled={demo.isPending || demo.isError || opening || busy}
        className="h-10 cursor-pointer rounded-xl px-4 font-bold"
      >
        {opening ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}{" "}
        {opening ? "Saving your details…" : "LIVE RECORD YOUR DEMO"}
      </Button>
      {demo.isError && (
        <p className="text-xs text-red-600">
          We couldn&apos;t load your demo attempts.{" "}
          <button type="button" className="cursor-pointer font-semibold underline" onClick={() => demo.refetch()}>
            Try again
          </button>
        </p>
      )}
      {status && (
        <p className={`flex items-center gap-1 text-xs ${chosenAttempt ? "font-semibold text-emerald-700" : "text-slate-600"}`}>
          {chosenAttempt && <CheckCircle2 className="h-3.5 w-3.5" />}
          {status}
        </p>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        {/* header and footer stay put; only the middle scrolls, so the footer sits on the drawer's bottom edge */}
        <SheetContent side="right" className="gap-0 p-0 sm:max-w-lg">
          <SheetHeader className="shrink-0 p-4 pr-12">
            <SheetTitle className="text-lg font-bold">Teachers Demo Video</SheetTitle>
            <SheetDescription>Record a live demo, then choose the recording you want us to review.</SheetDescription>
          </SheetHeader>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">

          <div className="rounded-xl border border-slate-200 p-3 text-[13px] text-slate-700">
            <p className="font-semibold text-black">
              To qualify for the next round, record a demo video of 4-7 minutes on a topic of your choice from our{" "}
              <a className="text-primary underline" href="https://internationalschooling.org/course-catalog/" target="_blank" rel="noopener noreferrer">
                Course Catalog
              </a>
              .
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {GUIDELINES.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <p className="mt-2">
              Record as if you are in front of a student: introduce yourself first, then give the demo of the course you are applying for.
            </p>
            <p className="mt-2 font-semibold text-primary">Our panel reviews: {CRITERIA.join(" | ")}.</p>
            <p className="mt-2 font-semibold text-black">
              You have {data?.maxAttempts ?? 2} attempts to record your demo, but only one recording is submitted: you choose which.
            </p>
          </div>

          {/* The legacy rule: the button is there only while an attempt is left; it names the attempt it would make
              ("LIVE RECORD YOUR DEMO", then "... (2nd Attempt)"), and once they are all used it is gone. */}
          <div className="flex flex-col items-center gap-1">
            {data?.canRecord && (
              <Button type="button" onClick={handleRecord} disabled={starting || busy} className="h-10 cursor-pointer rounded-xl px-4 font-bold">
                {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
                {starting ? "Please wait…" : demoRecordButtonLabel(data.attemptsUsed)}
              </Button>
            )}
            {data && !data.canRecord && (
              <p className="text-xs text-slate-600">
                You have used all {data.maxAttempts} attempts. Choose the recording to submit below.
              </p>
            )}
            {startError && <p className="text-center text-xs text-red-600">{startError}</p>}
          </div>

          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-black">Your attempts</h4>
            <Button type="button" variant="outline" size="sm" onClick={() => demo.refresh()} disabled={demo.isFetching} className="cursor-pointer">
              <RefreshCw className={`h-3.5 w-3.5 ${demo.isFetching ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
          {demo.stalled && (
            <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-800">
              We stopped checking automatically. If your recording is still not here, press Refresh in a few minutes.
            </p>
          )}

          <div className="flex flex-col gap-2.5 pb-2">
            {attempts.length === 0 && <p className="text-center text-xs text-slate-500">No attempts yet.</p>}
            {attempts.map((attempt) => {
              const isChosen = attempt.state === DEMO_STATE.READY && attempt.meetingId === chosenId;
              return (
                <div key={attempt.id} className={`rounded-xl border p-3 ${isChosen ? "border-primary bg-primary/5" : "border-slate-200"}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-black">{attempt.label}</span>
                    <StateBadge state={attempt.state} />
                  </div>
                  <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs text-slate-600">
                    <dt>Start</dt>
                    <dd>{formatDemoDateTime(attempt.startTime) || "—"}</dd>
                    <dt>End</dt>
                    <dd>{formatDemoDateTime(attempt.endTime) || "—"}</dd>
                    <dt>Duration</dt>
                    <dd>{attempt.duration || "—"}</dd>
                  </dl>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    {attempt.state === DEMO_STATE.READY && (
                      <>
                        <Button type="button" size="sm" variant="outline" onClick={() => setPlaying(attempt)} className="cursor-pointer">
                          <Play className="h-3.5 w-3.5" /> Recordings
                        </Button>
                        <label className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-black">
                          <input
                            type="radio"
                            name="teacher-demo-recording"
                            checked={isChosen}
                            onChange={() => onChoose(attempt.meetingId)}
                            className="h-4 w-4 cursor-pointer accent-primary"
                          />
                          Use this recording
                        </label>
                      </>
                    )}
                    {attempt.canReattempt && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleReattempt(attempt)}
                        disabled={starting || busy}
                        className="cursor-pointer border-amber-400 text-amber-800 hover:bg-amber-50"
                      >
                        {redoingId === attempt.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}{" "}
                        {redoingId === attempt.id ? "Starting…" : "Re-attempt"}
                      </Button>
                    )}
                    {(attempt.state === DEMO_STATE.WAITING || attempt.state === DEMO_STATE.IN_PROGRESS) && (
                      <Button type="button" size="sm" variant="outline" onClick={handleRecord} disabled={starting || busy} className="cursor-pointer">
                        Open the meeting again
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          </div>

          {/* on the drawer's bottom edge: choosing a recording ends with this, not with closing by hand */}
          {readyCount > 0 && (
            <div className="flex shrink-0 justify-center border-t border-slate-200 bg-white px-4 py-3">
              <Button
                type="button"
                disabled={!chosenAttempt}
                onClick={() => {
                  onChoose(chosenAttempt.meetingId);
                  setDrawerOpen(false);
                  toast.success(`${chosenAttempt.label} selected.`);
                }}
                className="h-10 w-full cursor-pointer rounded-xl px-6 font-bold sm:w-auto"
              >
                <CheckCircle2 className="h-4 w-4" /> {chosenAttempt ? `Select ${chosenAttempt.label}` : "Select a recording"}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={confirmRedo !== null} onOpenChange={(open) => !open && setConfirmRedo(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Re-attempt {confirmRedo?.label}?</DialogTitle>
            <DialogDescription>
              This removes the recording you already have for this attempt and starts a new meeting. It cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setConfirmRedo(null)} className="cursor-pointer">
              Keep it
            </Button>
            <Button
              type="button"
              onClick={() => {
                const attempt = confirmRedo;
                setConfirmRedo(null);
                startAttempt(attempt);
              }}
              className="cursor-pointer font-bold"
            >
              Remove and re-attempt
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={hostLink !== null} onOpenChange={(open) => !open && setHostLink(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Info className="h-5 w-5 text-primary" /> Information
            </DialogTitle>
            <DialogDescription className="sr-only">Your demo meeting has been created.</DialogDescription>
          </DialogHeader>
          <p className="text-center text-sm font-bold text-black">{hostLink?.title}</p>
          <div className="flex justify-center">
            {/* the dialog stays open on purpose: an anchor removed by its own click may never navigate */}
            <a href={hostLink?.hostUrl} target="_blank" rel="noopener noreferrer" className={`${buttonVariants()} h-9 cursor-pointer px-4 font-bold`}>
              Start Demo
            </a>
          </div>
          <hr className="border-t border-dashed border-slate-300" />
          <p className="text-center text-[13px] font-semibold text-black">
            If you face issues with joining, copy the host link below and paste it into a new tab on your browser:
          </p>
          {SHOW_HOST_LINK_TEXT && (
            <textarea
              readOnly
              value={hostLink?.hostUrl ?? ""}
              rows={3}
              onFocus={(event) => event.target.select()}
              className="w-full resize-none rounded-md border border-slate-300 bg-slate-50 p-2 text-xs text-slate-700"
            />
          )}
          <div className="flex justify-center">
            <Button type="button" onClick={copyLink} className="h-9 cursor-pointer bg-emerald-600 px-4 font-bold hover:bg-emerald-700">
              <Copy className="h-4 w-4" /> Copy Link
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <TeacherDemoRecordingViewer context={context} attempt={playing} onClose={() => setPlaying(null)} />
    </div>
  );
}
