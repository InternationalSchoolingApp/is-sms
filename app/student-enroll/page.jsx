// Wizard entry point. Stage 1–3 UI is built in later steps of the migration
// plan (Steps 3–10) — this is a Step 1 placeholder so the route exists and
// the app builds/runs end-to-end.
export default function StudentSignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <p className="text-sm text-neutral-500">
        Student Signup wizard — scaffold only (Step 1). Stages are built in later steps.
      </p>
    </main>
  );
}
