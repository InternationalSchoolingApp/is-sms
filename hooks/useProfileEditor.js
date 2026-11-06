"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getProfileMaster, saveMyProfile } from "@/services/profileSaveApi";
import { buildDraft, buildEditContext, buildUnits, sameValue } from "@/utils/profileEdit";
import { callServer } from "@/utils/serverCall";

/** One dropdown list (countries / timezones / states of a country / cities of a state), cached per id. */
export function useProfileMaster(kind, id, enabled = true) {
  const needsId = kind === "states" || kind === "cities";
  return useQuery({
    queryKey: ["profile-master", kind, needsId ? String(id || "") : ""],
    queryFn: () => callServer(() => getProfileMaster({ kind, id })),
    enabled: enabled && (!needsId || Number(id) > 0),
    staleTime: 30 * 60_000,
    refetchOnWindowFocus: false,
  });
}

/**
 * My Profile P2 editor: a draft of the editable fields (utils/profileEdit.js), saved per field (the green tick) or
 * all at once (Bulk Save) through services/profileSaveApi.js. Timezone and nationality ask first, like the existing
 * page. After a save the profile is loaded again and the saved fields take the server's values.
 *
 * Returns { draft, set, setMany, unitOf(key), status(unitId) -> { dirty, saving, saved, error }, save(unitIds),
 *           undo(unitId), saveAll(), dirtyCount, busy, confirm: { message, accept, cancel } | null, countries }.
 */
export function useProfileEditor({ profile, studentStandardId, refetch, enabled = true }) {
  const base = useMemo(() => (profile ? buildDraft(profile) : {}), [profile]);
  const ctx = useMemo(() => buildEditContext(profile), [profile]);
  const units = useMemo(() => buildUnits(ctx), [ctx]);
  const unitByKey = useMemo(() => {
    const map = {};
    units.forEach((u) => u.keys.forEach((k) => (map[k] = u)));
    return map;
  }, [units]);

  const countriesQuery = useProfileMaster("countries", null, enabled);
  const countries = useMemo(() => countriesQuery.data || [], [countriesQuery.data]);

  const [edits, setEdits] = useState({});
  const [saving, setSaving] = useState(() => new Set());
  const [saved, setSaved] = useState(() => new Set());
  const [errors, setErrors] = useState({});
  const [confirm, setConfirm] = useState(null);
  const savedTimer = useRef(null);
  useEffect(() => () => clearTimeout(savedTimer.current), []);

  const draft = useMemo(() => ({ ...base, ...edits }), [base, edits]);
  const isDirty = useCallback((u) => u.keys.some((k) => k in edits && !sameValue(edits[k], base[k])), [edits, base]);
  const dirtyUnits = useMemo(() => units.filter(isDirty), [units, isDirty]);

  const setMany = useCallback((values) => {
    setEdits((prev) => ({ ...prev, ...values }));
    setErrors((prev) => {
      const next = { ...prev };
      Object.keys(values).forEach((k) => {
        const u = unitByKey[k];
        if (u) delete next[u.id];
      });
      return next;
    });
  }, [unitByKey]);
  const set = useCallback((key, value) => setMany({ [key]: value }), [setMany]);

  // Forget edits of these units. With `sent` (the values a save sent), only the ones still equal to what was sent:
  // a field changed again while its save was running keeps the newer value.
  const dropEdits = (list, sent) =>
    setEdits((prev) => {
      const next = { ...prev };
      list.forEach((u) =>
        u.keys.forEach((k) => {
          if (!sent || sameValue(next[k], sent[k])) delete next[k];
        }),
      );
      return next;
    });

  const undo = useCallback((unitId) => {
    const u = units.find((x) => x.id === unitId);
    if (!u) return;
    dropEdits([u]);
    setErrors((prev) => {
      const next = { ...prev };
      delete next[unitId];
      return next;
    });
  }, [units]);

  const run = useCallback(
    async (list) => {
      const ids = list.map((u) => u.id);
      setSaving((prev) => new Set([...prev, ...ids]));
      try {
        const items = list.map((u) => u.build(draft, { ...ctx, countries }));
        const sent = Object.fromEntries(list.flatMap((u) => u.keys.map((k) => [k, draft[k]])));
        const result = await callServer(() => saveMyProfile({ studentStandardId, items }));
        await refetch?.();
        dropEdits(list, sent);
        setSaved(new Set(ids));
        clearTimeout(savedTimer.current);
        savedTimer.current = setTimeout(() => setSaved(new Set()), 2500);
        toast.success(list.length > 1 ? "All your changes are saved!" : result?.message || "Saved!");
      } catch (error) {
        const message = String(error?.message || "Your changes could not be saved.").replace(/^[A-Z_0-9]+:\s*/, "");
        setErrors((prev) => ({ ...prev, ...Object.fromEntries(ids.map((id) => [id, message])) }));
        toast.error(message);
      } finally {
        setSaving((prev) => {
          const next = new Set(prev);
          ids.forEach((id) => next.delete(id));
          return next;
        });
      }
    },
    [draft, ctx, countries, studentStandardId, refetch],
  );

  const save = useCallback(
    (unitIds) => {
      const list = units.filter((u) => unitIds.includes(u.id) && isDirty(u));
      if (!list.length) return;
      const problems = {};
      list.forEach((u) => {
        const problem = u.validate?.(draft);
        if (problem) problems[u.id] = problem;
      });
      if (Object.keys(problems).length) {
        setErrors((prev) => ({ ...prev, ...problems }));
        toast.error(Object.values(problems)[0]);
        return;
      }
      const warnings = list.filter((u) => u.confirm).map((u) => u.confirm);
      if (warnings.length) {
        setConfirm({
          message: warnings.join(" "),
          accept: () => {
            setConfirm(null);
            run(list);
          },
          cancel: () => setConfirm(null),
        });
        return;
      }
      run(list);
    },
    [units, isDirty, draft, run],
  );

  const saveAll = useCallback(() => save(dirtyUnits.map((u) => u.id)), [save, dirtyUnits]);

  const status = useCallback(
    (unitId) => {
      const u = units.find((x) => x.id === unitId);
      return { dirty: u ? isDirty(u) : false, saving: saving.has(unitId), saved: saved.has(unitId), error: errors[unitId] || null };
    },
    [units, isDirty, saving, saved, errors],
  );

  return {
    draft,
    set,
    setMany,
    unitOf: (key) => unitByKey[key]?.id,
    status,
    save,
    undo,
    saveAll,
    dirtyCount: dirtyUnits.length,
    busy: saving.size > 0,
    confirm,
    countries,
    hobbies: ctx.hobbies,
    clubs: ctx.clubs,
    social: ctx.social,
  };
}
