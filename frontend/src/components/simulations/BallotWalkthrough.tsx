import { useState, type ReactNode } from 'react';

import { buildBallotStages } from '../../engines/simulationEngine';

/** Hero heading describing the mail-ballot pedagogy micro-flow. */
const BALLOT_WALKTHROUGH_HEADING = 'See what happens to a mail ballot';

/** Primary control label advancing staged civic pedagogy. */
const BALLOT_WALKTHROUGH_NEXT_LABEL = 'Next stage';

/** Accent label prefix rendered above each mail-ballot checkpoint description. */
const BALLOT_WALKTHROUGH_STEP_PREFIX = 'Step';

type BallotStage = ReturnType<typeof buildBallotStages>[number];

/**
 * Props for {@link BallotWalkthrough}.
 */
export interface BallotWalkthroughProps {
  /** Ensures lazy-loaded civic bundles remain prop-compatible with Agentic registry wiring. */
  readonly orchestratorMounted?: true;
}

/**
 * Props for {@link BallotWalkthroughStepCard}.
 */
interface BallotWalkthroughStepCardProps {
  /** Zero-based checkpoint index informing learner orientation copy. */
  stepIndex: number;
  /** Structured pedagogical payload sourced from {@link buildBallotStages}. */
  stage: BallotStage;
}

/**
 * Renders the textual portion of the mail-ballot checkpoint storyboard.
 *
 * @param props - Active stage metadata plus learner-facing ordinal context.
 * @returns Highlight card summarizing the civic checkpoint narrative.
 */
function BallotWalkthroughStepCard({ stepIndex, stage }: BallotWalkthroughStepCardProps): ReactNode {
  const stepOrdinal = stepIndex + 1;

  return (
    <div className="mt-6 rounded-[18px] bg-[var(--surface-2)] p-5">
      <p className="text-sm font-semibold text-[var(--civic-green)]">
        {BALLOT_WALKTHROUGH_STEP_PREFIX} {stepOrdinal}
      </p>
      <h3 className="mt-2 text-xl font-bold text-[var(--ink)]">{stage.label}</h3>
      <p className="mt-2 text-[var(--ink-secondary)]">{stage.help}</p>
    </div>
  );
}

/**
 * Props for {@link BallotWalkthroughFooter}.
 */
interface BallotWalkthroughFooterProps {
  /** Advances to the next mail-ballot lifecycle checkpoint when available. */
  onAdvance: () => void;
}

/**
 * Footer controls allowing learners to pace multi-step ballot pedagogy.
 *
 * @param props - Advance handler emitted by parent state machine.
 * @returns Secondary button styled for civic continuity affordances.
 */
function BallotWalkthroughFooter({ onAdvance }: BallotWalkthroughFooterProps): ReactNode {
  return (
    <button
      type="button"
      className="mt-4 min-h-12 rounded-full bg-[var(--surface-2)] px-5 text-sm font-semibold text-[var(--ink)]"
      onClick={onAdvance}
    >
      {BALLOT_WALKTHROUGH_NEXT_LABEL}
    </button>
  );
}

/**
 * Mail-ballot lifecycle walkthrough surfaced inside Agentic civic simulations.
 *
 * Steps learners through signature, sealing, scanning, and tally milestones using deterministic
 * pedagogical copy sourced from {@link buildBallotStages}.
 *
 * @param _props - Reserved prop extension surface for Agentic registry symmetry.
 * @returns Pedagogical card sequence describing secured ballot handling.
 */
export default function BallotWalkthrough(_props: BallotWalkthroughProps): ReactNode {
  const stages = buildBallotStages();
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const safeIndex = Math.min(Math.max(activeIndex, 0), Math.max(stages.length - 1, 0));
  const stage = stages[safeIndex] ?? stages[0];

  if (!stage) {
    return null;
  }

  const handleAdvance = (): void => {
    setActiveIndex((current: number): number => Math.min(current + 1, stages.length - 1));
  };

  return (
    <section className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_8px_24px_var(--shadow)]">
      <h2 className="text-[1.6rem] font-bold text-[var(--ink)]">{BALLOT_WALKTHROUGH_HEADING}</h2>
      <BallotWalkthroughStepCard stage={stage} stepIndex={safeIndex} />
      <BallotWalkthroughFooter onAdvance={handleAdvance} />
    </section>
  );
}
