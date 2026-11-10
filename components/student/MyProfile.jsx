"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { K5Profile } from "@/components/k5/pages/K5Profile";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useProfileActions } from "@/hooks/useProfileActions";
import { useProfileEditor } from "@/hooks/useProfileEditor";
import { useProfileOtp } from "@/hooks/useProfileOtp";
import { useStudentProfile } from "@/hooks/useStudentProfile";

/**
 * My Profile — the signed-in student's own profile from profile-view-content-new
 * (services/profileApi.js -> utils/profileModel.js), editable for every grade band (Elementary, Middle,
 * High school) when the backend gives the right to edit: fields (P2), lists / documents (P3), OTP and
 * photo (P4), school e-mail and withdrawal (P5) — docs/migration/grade_k5_dashboard_plan.html section 19.
 * One page and one set of editors (components/k5/pages/K5Profile*.jsx): K–5 students see it in the
 * playful K–5 look; everyone else inside .theme-profile-plain (app/profile-plain.css), which gives the same
 * page the regular dashboard colours and sizes.
 */
export function MyProfile() {
  const router = useRouter();
  const { context, isK5 } = useDashboardContext();
  const { model, profile, studentStandardId, isLoading, error, refetch } = useStudentProfile({ schoolUUID: context?.schoolUUID, userId: context?.userId });
  // Editable for every grade when the backend gives the right to edit (the backend checks the same on save).
  const canEdit = Boolean(model?.rightToEdit && studentStandardId);
  const editor = useProfileEditor({ profile, studentStandardId, refetch, enabled: canEdit });
  // P3: lists that save at once (class times, calling times, activities, documents).
  const actions = useProfileActions({ studentStandardId, refetch, callingSlots: model?.parents?.callingSlots, classSlots: model?.timing?.slots, socialLinks: editor.social });
  // P4: one-time codes for saved phones / e-mails; the editors read them from the editor object.
  const otp = useProfileOtp({ refetch });
  const pageEditor = canEdit ? { ...editor, otp, verified: model?.verified || {} } : null;
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const back = () => {
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else if (context?.schoolUUID) router.push(`/${context.schoolUUID}/student`);
  };

  // The card is made by the backend for this user only; /api/profile/id-card opens it with the user's token.
  const downloadIdCard = async () => {
    const link = model?.academic?.idCardUrl;
    if (!link || downloading) return;
    let search = "";
    try {
      search = new URL(link).search;
    } catch {
      search = link.includes("?") ? link.slice(link.indexOf("?")) : "";
    }
    setDownloading(true);
    setDownloadProgress(0);
    let progressTimer = window.setInterval(() => {
      setDownloadProgress((current) => Math.min(90, current + 1));
    }, 250);
    try {
      const response = await fetch(`/api/profile/id-card${search}`, { cache: "no-store" });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message || "The ID card could not be downloaded.");
      }
      const contentLength = Number(response.headers.get("content-length"));
      if (Number.isFinite(contentLength) && contentLength > 0) {
        window.clearInterval(progressTimer);
        progressTimer = null;
      }
      const reader = response.body?.getReader();
      let blob;
      if (reader) {
        const chunks = [];
        let receivedLength = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          receivedLength += value.length;
          if (Number.isFinite(contentLength) && contentLength > 0) {
            setDownloadProgress(Math.min(100, Math.round((receivedLength / contentLength) * 100)));
          }
        }
        setDownloadProgress(100);
        blob = new Blob(chunks, { type: response.headers.get("content-type") || "application/pdf" });
      } else {
        blob = await response.blob();
        setDownloadProgress(100);
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `student-id-card${model.academic.studentId ? `-${model.academic.studentId}` : ""}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e) {
      toast.error(e?.message || "The ID card could not be downloaded.");
    } finally {
      if (progressTimer) window.clearInterval(progressTimer);
      setDownloading(false);
      setDownloadProgress(0);
    }
  };

  const loading = !context || isLoading;
  const page = (
    <K5Profile
      model={model}
      isLoading={loading}
      error={error}
      onRetry={() => refetch()}
      onBack={back}
      onDownloadIdCard={downloadIdCard}
      downloading={downloading}
      downloadProgress={downloadProgress}
      editor={pageEditor}
      actions={canEdit ? actions : null}
    />
  );
  // Inside the K–5 shell (.theme-k5) the K–5 tokens are already set; everyone else gets the plain scope.
  if (isK5) return page;
  return <div className="theme-profile-plain">{page}</div>;
}
