"use client";

import { useParams } from "next/navigation";

/**
 * Placeholder for parent dashboard modules not yet migrated. Keeps the (already correct) sidebar fully
 * navigable without 404s; the dashboard shell (header + sidebar + rail) still wraps it via the (dashboard)
 * layout. It disappears module by module as each real parent page lands.
 */
export function ParentModulePlaceholder() {
  const params = useParams();
  const parts = Array.isArray(params?.module) ? params.module : [params?.module].filter(Boolean);
  const label = parts
    .join(" / ")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <h1 className="text-lg font-extrabold text-black sm:text-xl">{label || "Module"}</h1>
        <p className="mt-2 text-sm text-black/60">This module is being migrated and will be available soon.</p>
      </div>
    </div>
  );
}
