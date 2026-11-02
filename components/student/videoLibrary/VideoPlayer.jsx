"use client";

import { useEffect, useImperativeHandle, useRef, useState } from "react";
import { saveVideoWatchProgress } from "@/services/videoLibraryApi";
import { isVideoLibrarySuccess } from "@/hooks/useStudentVideoLibrary";
import { parseYoutubeId } from "@/utils/videoLibrary";

const SAVE_EVERY_MS = 15000; // while playing
const TICK_MS = 5000;
const YT_PLAYING = 1;
const YT_ENDED = 0;
const YT_PAUSED = 2;

// The YouTube IFrame API, loaded once (svlLoadYtApi); a failed attempt may be retried on the next video.
let ytApiPromise = null;
function loadYtApi() {
  if (window.YT?.Player) return Promise.resolve();
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previous === "function") {
        try {
          previous();
        } catch {
          // another page's hook
        }
      }
      resolve();
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => reject(new Error("YouTube API failed to load"));
    document.head.appendChild(script);
    setTimeout(() => {
      if (!window.YT?.Player) reject(new Error("YouTube API timeout"));
    }, 8000);
  });
  ytApiPromise.catch(() => {
    ytApiPromise = null;
  });
  return ytApiPromise;
}

/**
 * One video of the library — legacy svlMountVideo() + the watch-progress reporting. Mounted per video
 * (key = video id): a FILE video plays in <video>, anything else through the YouTube IFrame API (so the
 * end can move on to the next lesson), falling back to a plain embed when the API is blocked.
 *
 * Progress (svlSaveProgress): only once the player reported PLAYING for this video; every 15s while
 * playing, on pause, on end, when the tab is hidden and when the video is left. One request in flight,
 * a newer report replaces a waiting one; `onProgress(videoId, details)` gets each answer.
 * `ref.startOver()` seeks to 0 and plays.
 */
export function VideoPlayer({ ref, video, autoplay, startAt, onEnded, onProgress }) {
  const ytId = video.videoType === "FILE" ? null : video.youtubeId || parseYoutubeId(video.videoUrl);
  const start = Math.max(0, Math.floor(startAt || 0));
  const [embedFallback, setEmbedFallback] = useState(false);
  const ytHostRef = useRef(null);
  const ytRef = useRef(null);
  const fileRef = useRef(null);
  const track = useRef({ seen: false, lastSentAt: 0, lastSentPos: -1, inFlight: false, pending: null });
  const callbacks = useRef({ onEnded, onProgress });
  useEffect(() => {
    callbacks.current = { onEnded, onProgress };
  });

  function playerTime() {
    try {
      const yt = ytRef.current;
      if (yt?.getCurrentTime) {
        return { position: yt.getCurrentTime() || 0, duration: yt.getDuration() || 0, playing: yt.getPlayerState?.() === YT_PLAYING };
      }
      const el = fileRef.current;
      if (el) return { position: el.currentTime || 0, duration: Number.isFinite(el.duration) ? el.duration : 0, playing: !el.paused && !el.ended };
    } catch {
      // player not ready
    }
    return null;
  }

  function send(body) {
    const t = track.current;
    t.inFlight = true;
    saveVideoWatchProgress(body)
      .then((response) => {
        if (isVideoLibrarySuccess(response) && response.details) callbacks.current.onProgress?.(body.videoId, response.details);
      })
      .catch(() => {
        // the next report will try again
      })
      .finally(() => {
        t.inFlight = false;
        if (t.pending) {
          const next = t.pending;
          t.pending = null;
          send(next);
        }
      });
  }

  function save(ended) {
    const t = track.current;
    if (!t.seen) return; // this video never played (yet): nothing of it was watched
    const now = playerTime();
    if (!now) return;
    const position = Math.floor(now.position);
    if (!ended && (position < 1 || position === t.lastSentPos)) return; // nothing watched / nothing new
    const body = { videoId: video.id, position, duration: Math.floor(now.duration), ended: Boolean(ended) };
    t.lastSentAt = Date.now();
    t.lastSentPos = position;
    if (t.inFlight) {
      t.pending = body;
      return;
    }
    send(body);
  }

  function ended() {
    save(true);
    callbacks.current.onEnded?.();
  }

  // save() / ended() read refs only, so the latest closures are always equivalent.
  const saveRef = useRef(save);
  const endedRef = useRef(ended);
  useEffect(() => {
    saveRef.current = save;
    endedRef.current = ended;
  });

  useImperativeHandle(ref, () => ({
    startOver() {
      const yt = ytRef.current;
      if (yt?.seekTo) {
        try {
          yt.seekTo(0, true);
          yt.playVideo();
        } catch {
          // not ready
        }
        return;
      }
      const el = fileRef.current;
      if (el) {
        el.currentTime = 0;
        el.play?.();
      }
    },
  }));

  // YouTube player for this video.
  useEffect(() => {
    if (!ytId) return undefined;
    let cancelled = false;
    loadYtApi().then(
      () => {
        if (cancelled || !ytHostRef.current) return;
        ytRef.current = new window.YT.Player(ytHostRef.current, {
          host: "https://www.youtube-nocookie.com",
          videoId: ytId,
          width: "100%",
          height: "100%",
          playerVars: { autoplay: autoplay ? 1 : 0, rel: 0, modestbranding: 1, playsinline: 1, start },
          events: {
            onStateChange: (e) => {
              if (e.data === YT_PLAYING) track.current.seen = true;
              else if (e.data === YT_ENDED) endedRef.current();
              else if (e.data === YT_PAUSED) saveRef.current(false);
            },
          },
        });
      },
      () => {
        // API blocked / offline: a plain embed still plays; only auto-advance + progress are lost
        if (!cancelled) setEmbedFallback(true);
      },
    );
    return () => {
      cancelled = true;
    };
    // mounted per video: the first values are the ones to use
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Progress ticks, hidden tab, and the last save when this video is left.
  useEffect(() => {
    track.current.lastSentAt = Date.now();
    const timer = setInterval(() => {
      const now = playerTime();
      if (now?.playing && Date.now() - track.current.lastSentAt >= SAVE_EVERY_MS) saveRef.current(false);
    }, TICK_MS);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") saveRef.current(false);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      saveRef.current(false);
      try {
        ytRef.current?.destroy?.();
      } catch {
        // already gone
      }
      ytRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  let content;
  if (video.videoType === "FILE") {
    content = (
      <video
        ref={(el) => {
          if (el) fileRef.current = el; // kept after unmount so the last save can still read it
        }}
        src={video.videoUrl}
        controls
        playsInline
        autoPlay={autoplay}
        onLoadedMetadata={(e) => {
          if (start) e.currentTarget.currentTime = start;
        }}
        onPlaying={() => {
          track.current.seen = true;
        }}
        onPause={(e) => {
          if (!e.currentTarget.ended) save(false);
        }}
        onEnded={ended}
        className="absolute inset-0 h-full w-full bg-black"
      />
    );
  } else if (!ytId) {
    content = <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-white">Unable to load this video.</div>;
  } else if (embedFallback) {
    content = (
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${ytId}?rel=0${autoplay ? "&autoplay=1" : ""}${start ? `&start=${start}` : ""}`}
        allow="autoplay; fullscreen; encrypted-media"
        allowFullScreen
        title="Video player"
        className="absolute inset-0 h-full w-full border-0"
      />
    );
  } else {
    // The YouTube API replaces this node with its iframe.
    content = (
      <div className="absolute inset-0 [&>iframe]:h-full [&>iframe]:w-full">
        <div ref={ytHostRef} />
      </div>
    );
  }

  return <div className="relative aspect-video w-full bg-black">{content}</div>;
}
