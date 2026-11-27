/**
 * Installment names carry ordinal suffixes as markup ("Grade 9 - 3<sup>rd</sup> of 4 Months Installment"),
 * which legacy injected as HTML. Renders just those <sup> parts; everything else stays plain text (never HTML).
 * Same rule as the local helpers in FeeDetails.jsx / K5FeeDetails.jsx.
 */
export function PaymentName({ name }) {
  return String(name || "")
    .split(/(<sup>.*?<\/sup>)/i)
    .map((part, index) => {
      const sup = part.match(/^<sup>(.*?)<\/sup>$/i);
      return sup ? <sup key={index}>{sup[1]}</sup> : part;
    });
}
