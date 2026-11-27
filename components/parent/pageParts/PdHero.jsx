/** The reference's page banner (.sc-hero): title and optional subtitle. */
export function PdHero({ title, subtitle }) {
  return (
    <div className="sc-hero">
      <div>
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
    </div>
  );
}
