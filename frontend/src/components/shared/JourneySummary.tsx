const JourneySummary = () => (
  <section className="rounded-[24px] border border-[var(--civic-green)] bg-[var(--civic-green-light)] p-6 shadow-[0_8px_24px_var(--shadow)]">
    <div className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-bold text-[var(--civic-green)]">
      You are ready
    </div>
    <h2 className="mt-4 text-[1.8rem] font-extrabold text-[var(--ink)]">
      You officially know your next voting step.
    </h2>
    <p className="mt-3 max-w-prose text-[var(--ink)]">
      This is a real win. You can come back any time and review your path.
    </p>
  </section>
);

export default JourneySummary;
