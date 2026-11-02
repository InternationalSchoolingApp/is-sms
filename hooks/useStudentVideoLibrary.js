"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getStudentVideoPlaylists } from "@/services/videoLibraryApi";
import { buildSteps } from "@/utils/videoLibrary";

export const VIDEO_LIBRARY_KEY = (userId) => ["student-video-library", userId];

export function isVideoLibrarySuccess(response) {
  return Boolean(response && (response.status === "SUCCESS" || response.status === "1" || response.statusCode === "200" || response.statusCode === "SUCCESS"));
}

/**
 * Video Library playlists — legacy svlLoadPlaylists(). Courses without any video are dropped; a plain
 * list (older server) means no paywall. `applyProgress` stores a progress answer on its video
 * (legacy svlApplyProgress) without refetching.
 */
export function useStudentVideoLibrary(userId) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: VIDEO_LIBRARY_KEY(userId),
    queryFn: async () => {
      const response = await getStudentVideoPlaylists();
      if (!isVideoLibrarySuccess(response)) {
        return { ok: false, message: response?.message || "Failed to load videos.", access: null, playlists: [] };
      }
      const details = response.details ?? [];
      const list = Array.isArray(details) ? details : details.playlists ?? [];
      return {
        ok: true,
        access: Array.isArray(details) ? null : details.access ?? null,
        playlists: list.filter((detail) => buildSteps(detail).length > 0),
      };
    },
    enabled: Boolean(userId),
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  function applyProgress(videoId, progress) {
    const patchVideo = (video) =>
      video.id !== videoId
        ? video
        : {
            ...video,
            watchedPercent: progress.watchedPercent,
            watchCompleted: Boolean(progress.completed),
            lastPosition: progress.lastPosition,
            lastWatchedAt: String(Date.now()),
          };
    queryClient.setQueryData(VIDEO_LIBRARY_KEY(userId), (old) =>
      old
        ? {
            ...old,
            playlists: old.playlists.map((detail) => ({
              ...detail,
              lessons: (detail.lessons ?? []).map((lesson) => ({ ...lesson, videos: (lesson.videos ?? []).map(patchVideo) })),
              otherVideos: (detail.otherVideos ?? []).map(patchVideo),
            })),
          }
        : old,
    );
  }

  return { ...query, applyProgress };
}
