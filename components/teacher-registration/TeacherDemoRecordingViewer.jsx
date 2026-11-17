"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTeacherDemoPlayback, useTeacherDemoTranscript } from "@/hooks/useTeacherDemoRecorder";
import { parseDemoTranscript, transcriptSourceUrl } from "@/utils/teacherDemoRecording";

// Next to each recording file: can it be played right now (legacy "Available / Archived / Restoring" badges).
function AvailabilityBadge({ availability }) {
  const [text, tone] =
    availability === "archived"
      ? ["Archived", "bg-amber-50 text-amber-700"]
      : availability === "restoring"
        ? ["Restoring", "bg-sky-50 text-sky-700"]
        : ["Available", "bg-emerald-50 text-emerald-700"];
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tone}`}>{text}</span>;
}

/**
 * The recordings of one demo attempt (a mapped attempt of utils/teacherDemoRecording.js), as the legacy wizard showed
 * them: every file Lens made for the attempt (screen share, speaker view, audio ...) with a Play button, then its
 * transcript. Playing opens a "Demo Video" dialog, reading the transcript a "Transcript" dialog. Used by the recorder
 * drawer (Step 2) and by the review screen (Step 3).
 *
 *   attempt: the attempt to show, or null (closed)     onClose()
 */
export function TeacherDemoRecordingViewer({ context, attempt, onClose }) {
  const [video, setVideo] = useState(null); // { url, label } while a recording plays
  const [transcript, setTranscript] = useState(null); // { lines | null } while the transcript is open
  const [playError, setPlayError] = useState("");
  const [loadingUrl, setLoadingUrl] = useState("");
  const playback = useTeacherDemoPlayback({ context });
  const readTranscript = useTeacherDemoTranscript({ context });
  const transcriptSource = transcriptSourceUrl(attempt?.recordings);

  async function handlePlay(recording) {
    setPlayError("");
    setLoadingUrl(recording.url);
    try {
      const answer = await playback.mutateAsync(recording.url);
      if (answer?.url) setVideo({ url: answer.url, label: recording.label });
      else setPlayError(answer?.message || "We couldn't load this recording.");
    } catch {
      setPlayError("We couldn't load this recording.");
    } finally {
      setLoadingUrl("");
    }
  }

  async function handleReadTranscript(recordingUrl) {
    setPlayError("");
    setLoadingUrl(recordingUrl);
    try {
      const answer = await readTranscript.mutateAsync(recordingUrl);
      if (typeof answer?.content === "string") setTranscript({ lines: parseDemoTranscript(answer.content) });
      else setPlayError(answer?.message || "Failed to load transcript.");
    } catch {
      setPlayError("Failed to load transcript.");
    } finally {
      setLoadingUrl("");
    }
  }

  return (
    <>
      {/* every file Lens made for the attempt (screen share, speaker view, audio ...), then its transcript */}
      <Dialog open={attempt !== null} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Available Recordings | {attempt?.label}</DialogTitle>
            <DialogDescription>Play a recording, or read the transcript of the meeting.</DialogDescription>
          </DialogHeader>
          {playError && <p className="text-xs text-red-600">{playError}</p>}
          <div className="flex flex-col divide-y divide-slate-100">
            {attempt?.recordings.length === 0 && <p className="py-2 text-xs text-slate-500">No recordings available.</p>}
            {attempt?.recordings.map((recording, index) => (
              <div key={recording.url} className="flex items-center justify-between gap-2 py-2">
                <span className="flex flex-wrap items-center gap-2 text-sm text-black">
                  {index + 1}. {recording.label}
                  <AvailabilityBadge availability={recording.availability} />
                </span>
                <Button
                  type="button"
                  size="sm"
                  disabled={!recording.playable || loadingUrl === recording.url}
                  onClick={() => handlePlay(recording)}
                  className="cursor-pointer"
                >
                  {loadingUrl === recording.url ? "Loading…" : "Play"}
                </Button>
              </div>
            ))}
            {transcriptSource && (
              <div className="flex items-center justify-between gap-2 py-2">
                <span className="text-sm text-black">{attempt.recordings.length + 1}. Transcript</span>
                <Button type="button" size="sm" disabled={loadingUrl === transcriptSource} onClick={() => handleReadTranscript(transcriptSource)} className="cursor-pointer">
                  {loadingUrl === transcriptSource ? "Loading…" : "Read"}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={video !== null} onOpenChange={(open) => !open && setVideo(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Demo Video | {video?.label}</DialogTitle>
            <DialogDescription className="sr-only">Playing your demo recording.</DialogDescription>
          </DialogHeader>
          {video && (
            <video key={video.url} className="max-h-[70vh] w-full rounded-md bg-black" controls autoPlay src={video.url}>
              Your browser does not support the video tag.
            </video>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={transcript !== null} onOpenChange={(open) => !open && setTranscript(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Transcript</DialogTitle>
            <DialogDescription className="sr-only">The transcript of your demo meeting.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[65vh] overflow-y-auto text-left">
            {transcript?.lines ? (
              transcript.lines.map((line, index) => (
                <p key={index} className="min-h-[1em] text-sm whitespace-pre-wrap text-black">
                  {line}
                </p>
              ))
            ) : (
              <p className="text-base text-black">No Transcript Available</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
