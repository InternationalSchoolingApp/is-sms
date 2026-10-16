"use client";

import { useState } from "react";
import { CalendarModal } from "@/components/dashboard/calendar/CalendarModal";

function toEmbedUrl(videoUrl) {
  // Accept either a full YouTube URL or a bare video id, same as the legacy
  // onBordingMandotryVideo()'s onYouTubeIframeAPIReady(videoID) usage.
  const idMatch = String(videoUrl).match(/(?:v=|youtu\.be\/|embed\/)([\w-]{6,})/);
  const videoId = idMatch ? idMatch[1] : videoUrl;
  return `https://www.youtube.com/embed/${videoId}?autoplay=0`;
}

/**
 * Mandatory onboarding video (legacy onBordingMandotryVideo / YouTube IFrame
 * API). The legacy page also POSTs update-vedio-watched-status when the video
 * ends — that backend endpoint doesn't exist (confirmed by reading the Java
 * source; no matching @PostMapping anywhere), so the watched-status write-back
 * is intentionally left out here rather than calling a 404. Flag this to the
 * backend team before relying on it.
 */
export function OnboardingVideoModal({ videoUrl }) {
  const [dismissed, setDismissed] = useState(false);
  if (!videoUrl || dismissed) return null;

  return (
    <CalendarModal title="Welcome! Please watch this short video" onClose={() => setDismissed(true)}>
      <div className="aspect-video w-full overflow-hidden rounded-lg">
        <iframe
          src={toEmbedUrl(videoUrl)}
          title="Onboarding video"
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </CalendarModal>
  );
}
