interface StatusSummaryProps {
  title?: string;
  description?: string;
  steps?: string[];
}

const StatusSummary = ({
  title = 'You still have options.',
  description = 'We will choose the calmest next step.',
  steps = [],
}: StatusSummaryProps) => (
  <section className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_8px_24px_var(--shadow)]">
    <h2 className="text-[1.6rem] font-bold text-[var(--ink)]">{title}</h2>
    <p className="mt-2 max-w-prose text-[var(--ink-secondary)]">{description}</p>
    <div className="mt-5 space-y-3">
      {steps.map((step) => (
        <div
          key={step}
          className="rounded-[16px] bg-[var(--surface-2)] px-4 py-3 text-[var(--ink)]"
        >
          {step}
        </div>
      ))}
    </div>
  </section>
);

export default StatusSummary;
