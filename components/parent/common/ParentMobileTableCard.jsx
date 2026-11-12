/**
 * The parent pages' phone table row (own copy, like the student's MobileTableCard). Phone layout of one table row: every cell on its own line with its column title beside it,
 * styled like the desktop header band so the card still reads as the table.
 * rows: [{ label, value, className? }] — className styles the value cell (e.g. a score colour).
 */
export function ParentMobileTableCard({ rows, labelClassName = "bg-primary text-white" }) {
  return (
    <dl className="overflow-hidden rounded border border-slate-200 text-sm">
      {rows.map(({ label, value, className }) => (
        <div key={label} className="grid grid-cols-[40%_1fr] border-b border-slate-200 last:border-b-0">
          <dt className={`px-3 py-2 ${labelClassName}`}>{label}</dt>
          <dd className={`break-words px-3 py-2 ${className || "text-black"}`}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
