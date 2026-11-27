"use client";

import { useEffect, useRef, useState } from "react";
import { MessagesSquare } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { buildChatSignInUrl } from "@/utils/chatLink";

// Accept either a full YouTube URL or a bare video id (legacy onYouTubeIframeAPIReady(videoID)).
function videoIdOf(videoUrl) {
  const match = String(videoUrl).match(/(?:v=|youtu\.be\/|embed\/)([\w-]{6,})/);
  return match ? match[1] : String(videoUrl);
}

// The YouTube IFrame API, loaded once for the page.
let apiPromise = null;
function loadYouTubeApi() {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!apiPromise) {
    apiPromise = new Promise((resolve, reject) => {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previous?.();
        resolve(window.YT);
      };
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = () => {
        apiPromise = null;
        reject(new Error("YouTube API blocked"));
      };
      document.head.appendChild(script);
    });
  }
  return apiPromise;
}

// If YouTube cannot be reached the student must not be stuck behind a video that cannot end.
const FALLBACK_UNLOCK_MS = 15000;

const BTN = "min-h-11 cursor-pointer rounded-xl border px-5 text-base font-semibold disabled:cursor-default disabled:opacity-50";

/**
 * Mandatory onboarding video (legacy onBordingMandotryVideo + onYouTubeIframeAPIReady / onPlayerStateChange):
 * "Welcome! {name}" over the video, no way to close it, and the two buttons stay off until the video has ended:
 * "Watch Again" replays it and "Book System Training" closes it - the School System Training popup then takes its turn
 * (components/dashboard/SystemTrainingPopup.jsx waits for any open popup). "Talk to School Administration" opens the
 * chat. Legacy also posted update-vedio-watched-status here, but that endpoint does not exist in the backend (nothing
 * is saved there either), so the watched state lives for this page only, exactly as in legacy.
 */
export function OnboardingVideoModal({ videoUrl }) {
  const { context } = useDashboardContext();
  const [closed, setClosed] = useState(false);
  const [ended, setEnded] = useState(false);
  const hostRef = useRef(null);
  const playerRef = useRef(null);
  const videoId = videoUrl ? videoIdOf(videoUrl) : "";
  const active = Boolean(videoId) && !closed;

  useEffect(() => {
    if (!active) return undefined;
    let cancelled = false;
    const fallback = setTimeout(() => setEnded(true), FALLBACK_UNLOCK_MS);
    loadYouTubeApi()
      .then((YT) => {
        if (cancelled || !hostRef.current) return;
        playerRef.current = new YT.Player(hostRef.current, {
          height: "390",
          width: "100%",
          videoId,
          playerVars: { modestbranding: 1, rel: 0, iv_load_policy: 3, fs: 0, cc_load_policy: 0, disablekb: 1, playsinline: 1 },
          events: {
            onReady: () => clearTimeout(fallback),
            onStateChange: (event) => {
              if (event.data === YT.PlayerState.ENDED) setEnded(true);
            },
          },
        });
      })
      .catch(() => {
        // blocked: the fallback timer unlocks the buttons
      });
    return () => {
      cancelled = true;
      clearTimeout(fallback);
      try {
        playerRef.current?.destroy();
      } catch {
        // already gone
      }
      playerRef.current = null;
    };
  }, [active, videoId]);

  if (!active) return null;
  const chatHref = buildChatSignInUrl({ chatUrl: context?.chatUrl, uniqueId: context?.uniqueId, deploymentMode: process.env.NEXT_PUBLIC_DEPLOYMENT_MODE });

  return (
    <Dialog open disablePointerDismissal>
      <DialogContent showCloseButton={false} data-blocking-popup="" className="gap-0 overflow-hidden p-0 text-center sm:max-w-3xl">
        <div className="bg-primary px-4 py-2 text-white">
          <DialogTitle className="m-0 text-lg font-semibold">Welcome! {context?.userName}</DialogTitle>
        </div>
        <div className="flex flex-col gap-2 p-2">
          {chatHref && (
            <div className="flex justify-end">
              <a href={chatHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary no-underline">
                <MessagesSquare className="h-4 w-4" aria-hidden="true" />
                Talk to School Administration
              </a>
            </div>
          )}
          <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
            <div ref={hostRef} />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t p-3">
          <button
            type="button"
            disabled={!ended}
            onClick={() => {
              playerRef.current?.seekTo?.(0);
              playerRef.current?.playVideo?.();
            }}
            className={`${BTN} ${ended ? "border-primary bg-white text-primary" : "border-slate-300 bg-white text-slate-500"}`}
          >
            Watch Again
          </button>
          <button type="button" disabled={!ended} onClick={() => setClosed(true)} className={`${BTN} ${ended ? "border-primary bg-primary text-white" : "border-slate-300 bg-slate-200 text-slate-500"}`}>
            Book System Training
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
