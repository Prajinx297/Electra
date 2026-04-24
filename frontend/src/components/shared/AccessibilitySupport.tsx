const supportCards = [
  {
    title: "Mobility help",
    body: "See wheelchair-friendly places and curbside voting."
  },
  {
    title: "Low-vision help",
    body: "Look for large print and audio ballot support."
  },
  {
    title: "Language help",
    body: "Find translation services and simpler wording."
  }
];

const AccessibilitySupport = () => (
  <section className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_8px_24px_var(--shadow)]">
    <h2 className="text-[1.6rem] font-bold text-[var(--ink)]">Choose the support you need</h2>
    <p className="mt-2 max-w-prose text-[var(--ink-secondary)]">
      We can make the voting plan fit you.
    </p>
    <div className="mt-5 grid gap-3">
      {supportCards.map((card) => (
        <div key={card.title} className="rounded-[18px] bg-[var(--surface-2)] p-4">
          <p className="font-bold text-[var(--ink)]">{card.title}</p>
          <p className="mt-1 text-[var(--ink-secondary)]">{card.body}</p>
        </div>
      ))}
    </div>
  </section>
);

export default AccessibilitySupport;
