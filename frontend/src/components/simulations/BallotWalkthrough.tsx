import { useState } from 'react';

import { buildBallotStages } from '../../engines/simulationEngine';

const BallotWalkthrough = () => {
  const stages = buildBallotStages();
  const [index, setIndex] = useState(0);
  const stage = stages[index] ?? stages[0];

  if (!stage) {
    return null;
  }

  return (
    <section className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_8px_24px_var(--shadow)]">
      <h2 className="text-[1.6rem] font-bold text-[var(--ink)]">
        How voting works at your polling booth
      </h2>
      <p className="mt-2 text-sm text-[var(--ink-secondary)]">
        India uses Electronic Voting Machines (EVMs) exclusively since 2001, with VVPAT verification since 2013.
      </p>
      <div className="mt-6 rounded-[18px] bg-[var(--surface-2)] p-5">
        <p className="text-sm font-semibold text-[var(--civic-green)]">
          Step {index + 1} of {stages.length}
        </p>
        <h3 className="mt-2 text-xl font-bold text-[var(--ink)]">{stage.label}</h3>
        <p className="mt-2 text-[var(--ink-secondary)]">{stage.help}</p>
      </div>
      <button
        type="button"
        onClick={() => setIndex((current) => Math.min(current + 1, stages.length - 1))}
        disabled={index === stages.length - 1}
        className="mt-4 min-h-12 rounded-full bg-[var(--surface-2)] px-5 text-sm font-semibold text-[var(--ink)] disabled:opacity-40"
      >
        {index === stages.length - 1 ? 'Process complete' : 'Next step'}
      </button>
    </section>
  );
};

export default BallotWalkthrough;
