"use client";

import { useMutation } from "@tanstack/react-query";
import {
  applyAdvisorSuggestions,
  askAdvisor,
  confirmAdvisorMarksheet,
  dismissAdvisorSuggestions,
  getAdvisorStart,
  getAdvisorSuggestions,
} from "@/services/courseAdvisorApi";

/**
 * AI Course Advisor calls (Step 3). All are mutations on purpose: nothing
 * runs on page load — each fires only from a click inside the AI Suggester.
 * Responses follow the backend's { status, statusCode, message } shape;
 * status "3" means the session ended.
 */

function required(response, what) {
  if (!response) throw new Error(`${what} returned no response`);
  return response;
}

export function useAdvisorStart({ context }) {
  return useMutation({
    mutationFn: async () => required(await getAdvisorStart(context.schoolUUID), "ai-course-advisor/init"),
  });
}

/**
 * Upload goes to the marksheet-upload Route Handler (not a Server Action:
 * those cap bodies at 1 MB). `files` are already prepared by prepareMarksheetFiles.
 */
export function useMarksheetUpload({ school, program }) {
  return useMutation({
    mutationFn: async (files) => {
      const form = new FormData();
      files.forEach((file) => form.append("files", file, file.name));
      const response = await fetch(`/${school}/enrollment/${program}/marksheet-upload`, { method: "POST", body: form });
      if (!response.ok) throw new Error(`marksheet-upload failed with ${response.status}`);
      return response.json();
    },
  });
}

export function useConfirmMarksheet({ context }) {
  return useMutation({
    mutationFn: async (marksheet) =>
      required(await confirmAdvisorMarksheet(context.schoolUUID, marksheet), "ai-course-advisor/marksheet/confirm"),
  });
}

export function useAdvisorSuggestions({ context }) {
  return useMutation({
    mutationFn: async ({ answers, marksheetId }) =>
      required(await getAdvisorSuggestions(context.schoolUUID, { answers, marksheetId }), "ai-course-advisor/recommend"),
  });
}

export function useApplySuggestions({ context }) {
  return useMutation({
    mutationFn: async ({ recommendationId, itemIds, confirmations }) =>
      required(
        await applyAdvisorSuggestions(context.schoolUUID, { recommendationId, itemIds, confirmations }),
        "ai-course-advisor/apply"
      ),
  });
}

export function useDismissSuggestions({ context }) {
  return useMutation({
    mutationFn: async ({ recommendationId, itemIds }) =>
      dismissAdvisorSuggestions(context.schoolUUID, { recommendationId, itemIds }),
  });
}

export function useAdvisorChat({ context }) {
  return useMutation({
    mutationFn: async ({ question, history, marksheetId }) =>
      required(await askAdvisor(context.schoolUUID, { question, history, marksheetId }), "ai-course-advisor/chat"),
  });
}
