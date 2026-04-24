interface DecisionCardProps {
  title?: string;
  description?: string;
  bullets?: string[];
}

const DecisionCard = ({
  title = "You are in the right place.",
  description = "We will handle one small step now.",
  bullets = []
}: DecisionCardProps) => (
  <section className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_8px_24px_var(--shadow)]">
    <h2 className="text-[1.7rem] font-bold text-[var(--ink)]">{title}</h2>
    <p className="mt-3 max-w-prose text-[var(--ink-secondary)]">{description}</p>
    {bullets.length > 0 ? (
      <ul className="mt-4 space-y-3 text-[var(--ink)]">
        {bullets.map((bullet) => (
          <li key={bullet} className="rounded-[16px] bg-[var(--surface-2)] px-4 py-3">
            {bullet}
          </li>
        ))}
      </ul>
    ) : null}
  </section>
);

export default DecisionCard;
