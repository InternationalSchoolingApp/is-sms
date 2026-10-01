import Link from "next/link";

// Root 404 UI, rendered when notFound() is called in a route segment (e.g.
// an unknown school slug in app/[school]/page.jsx) or an unmatched route.
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#eef4fb] bg-gradient-to-b from-[#eaf2fc] via-[#eef5fc] to-[#e7f0fb] p-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-xl shadow-slate-900/5 ring-1 ring-slate-900/5 sm:p-10">
        <p className="text-5xl font-extrabold tracking-tight text-primary">404</p>
        <h1 className="mt-4 text-xl font-bold text-slate-900">Page not found</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          The page you’re looking for doesn’t exist or may have moved.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
        >
          Go to homepage
        </Link>
      </div>
    </main>
  );
}
