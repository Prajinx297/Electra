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
        See what happens to a mail ballot
      </h2>
      <div className="mt-6 rounded-[18px] bg-[var(--surface-2)] p-5">
        <p className="text-sm font-semibold text-[var(--civic-green)]">Step {index + 1}</p>
        <h3 className="mt-2 text-xl font-bold text-[var(--ink)]">{stage.label}</h3>
        <p className="mt-2 text-[var(--ink-secondary)]">{stage.help}</p>
      </div>
      <button
        type="button"
        onClick={() => setIndex((current) => Math.min(current + 1, stages.length - 1))}
        className="mt-4 min-h-12 rounded-full bg-[var(--surface-2)] px-5 text-sm font-semibold text-[var(--ink)]"
      >
        Next stage
      </button>
    </section>
  );
};

export default BallotWalkthrough;
