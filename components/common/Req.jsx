/** Field label with the red required asterisk — shared by every wizard form so the asterisk stays consistent. */
export function Req({ label, required }) {
  return (
    <>
      <span className="text-[13px]">{label}</span>
      {required && <span className="relative top-1 ml-1 text-red-500">*</span>}
    </>
  );
}
