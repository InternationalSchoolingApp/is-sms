import { RequiredAsterisk } from "@/components/common/RequiredAsterisk";

/** Field label with the red required asterisk — shared by every wizard form so the asterisk stays consistent. */
export function Req({ label, required }) {
  return (
    <>
      <span className="text-[13px]">{label}</span>
      {required && <RequiredAsterisk className="ml-1" />}
    </>
  );
}
