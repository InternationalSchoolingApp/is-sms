"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { saveMyGoals } from "@/services/profileSaveApi";
import { callServer } from "@/utils/serverCall";
import { useDummyStudent } from "@/hooks/useDummyStudent";
import { fmtShort } from "@/components/k5/pages/k5PerformanceData";

/**
 * The student's goals (score goal, finish date, reminders, class comparison) from the My Performance data, and how
 * they are saved. Shared by My Performance and the home page's "My goals" card, so both save the same way: the existing
 * saveMyGoals call, then the performance data is fetched again (both places read the same cached query).
 * Demo / ?dummyStudent=Y: goals live on the page only, nothing is written to the backend.
 */
export function useMyGoals(performance) {
  const dummy = useDummyStudent();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [dummyGoals, setDummyGoals] = useState(null);

  const goals = { ...(performance?.goals || {}), ...(dummy.enabled && dummyGoals ? dummyGoals : {}) };
  goals.remind = goals.remind !== "N";
  goals.compare = goals.compare !== "N";

  const saveGoals = async (next) => {
    if (dummy.enabled) {
      setDummyGoals({ ...next, saved: true });
      toast.success(`Goals saved — aiming for ${next.score}% by ${fmtShort(next.finishBy)}`);
      return true;
    }
    setSaving(true);
    try {
      await callServer(() => saveMyGoals(next));
      toast.success(`Goals saved — aiming for ${next.score}% by ${fmtShort(next.finishBy)}`);
      // The dialog closes now and the page recalculates behind it.
      queryClient.invalidateQueries({ queryKey: ["student-academic-performance"] });
      return true;
    } catch (error) {
      toast.error(String(error?.message || "Your goals could not be saved.").replace(/^[A-Z0-9_]+: /, ""));
      return false;
    } finally {
      setSaving(false);
    }
  };

  return { goals, saveGoals, saving };
}
