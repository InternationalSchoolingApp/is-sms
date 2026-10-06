/** Shared required-field marker so its baseline stays consistent across forms. */
export function RequiredAsterisk({ className = "" }) {
  return (
    <span aria-hidden="true" className={`relative top-1.5 text-red-500 ${className}`}>
      *
    </span>
  );
}
