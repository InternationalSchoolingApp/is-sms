"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useSelectedChild } from "@/hooks/parent/useSelectedChild";
import { getParentAcademicDocs } from "@/services/parentAcademicDocsApi";

/**
 * The selected child's academic documents (legacy parentAcademicDocs.js). status "1" = ok, "3" = session out, anything
 * else is shown as empty; null data = the call itself failed. Key = [feature, school, parent, child].
 */
export function useParentAcademicDocs() {
  const { context } = useDashboardContext();
  const { selectedChild } = useSelectedChild();
  const schoolUUID = context?.schoolUUID;
  const parentUserId = context?.userId;
  const studentUserId = selectedChild ? String(selectedChild.userId) : null;
  const enabled = Boolean(schoolUUID && parentUserId && studentUserId);

  const query = useQuery({
    queryKey: ["parent-academic-docs", schoolUUID, parentUserId, studentUserId],
    queryFn: () => getParentAcademicDocs({ schoolUUID, studentUserId }),
    enabled,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  return {
    isLoading: enabled && query.isPending,
    sessionOut: query.data?.status === "3",
    failed: !query.isPending && !query.data,
    rows: query.data?.status === "1" ? query.data.rows : [],
    retry: () => query.refetch(),
  };
}

const VIEWABLE = /^(text\/html|application\/pdf|image\/)/i;

/**
 * Asks /api/parent/academic-docs for one document (POST body: the child, the kind and the row reference; no id in
 * any URL) and shows it: PDFs, pages and images open in a new tab, anything else is saved. `busy` is the "row:kind"
 * being fetched. Failures are a toast with the server's message.
 */
export function useAcademicDocDownload() {
  const { selectedChild } = useSelectedChild();
  const [busy, setBusy] = useState(null);

  const download = async (row, kind) => {
    if (busy || !selectedChild) return;
    setBusy(`${row.index}:${kind}`);
    // Opened inside the click so the browser does not treat it as a popup; filled in once the file is here.
    const tab = window.open("", "_blank");
    try {
      const response = await fetch("/api/parent/academic-docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ studentUserId: String(selectedChild.userId), kind, index: row.index, rowKey: row.rowKey }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message || "The document could not be downloaded. Please try again.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      if (tab && VIEWABLE.test(blob.type)) {
        tab.opener = null;
        tab.location.href = url;
      } else {
        tab?.close();
        const a = document.createElement("a");
        a.href = url;
        a.download = /filename="?([^";]+)"?/i.exec(response.headers.get("content-disposition") || "")?.[1] || kind;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      tab?.close();
      toast.error(error?.message || "The document could not be downloaded. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  return { busy, download };
}
