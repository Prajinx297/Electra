interface WelcomeStepProps {
  title?: string;
  description?: string;
}

const WelcomeStep = ({
  title = 'Voting can feel big. We can make it simple.',
  description = 'Tell me what you need help with, and I will guide you step by step.',
}: WelcomeStepProps) => (
  <section className="rounded-[28px] bg-[var(--surface)] p-6 shadow-[0_8px_24px_var(--shadow)]">
    <div className="inline-flex rounded-full bg-[var(--civic-green-light)] px-4 py-2 text-sm font-semibold text-[var(--civic-green)]">
      You are not behind
    </div>
    <h1 className="mt-4 text-[2rem] font-extrabold text-[var(--ink)]">{title}</h1>
    <p className="mt-3 max-w-prose text-[var(--ink-secondary)]">{description}</p>
  </section>
);

export default WelcomeStep;
