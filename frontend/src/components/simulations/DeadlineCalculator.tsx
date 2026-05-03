import { useMemo, useState, type ChangeEvent, type ReactNode } from 'react';

import { calculateDeadline } from '../../engines/simulationEngine';
import type { DeadlineResult } from '../../types';

/** Synthetic ISO snapshots keyed by demo-friendly US state labels for hackathon judging. */
const DEMO_STATE_DEADLINE_ISO_BY_LABEL: Record<string, string> = {
  Arizona: '2026-10-05T00:00:00.000Z',
  Georgia: '2026-10-06T00:00:00.000Z',
  Wisconsin: '2026-10-14T00:00:00.000Z',
  'New York': '2026-10-24T00:00:00.000Z',
};

/** Default demo selection aligning with Midwest learner personas used in scripts. */
const DEADLINE_CALCULATOR_DEFAULT_STATE_LABEL = 'Wisconsin';

/** Canonical fallback ISO timestamp mirroring Wisconsin demo copy when lookups drift. */
const DEADLINE_CALCULATOR_FALLBACK_ISO =
  DEMO_STATE_DEADLINE_ISO_BY_LABEL.Wisconsin ?? '2026-10-14T00:00:00.000Z';

/** Hero heading describing voter-registration urgency surfacing. */
const DEADLINE_CALCULATOR_SECTION_TITLE = 'See your deadline';

/** Accessible label describing the jurisdiction selector control. */
const DEADLINE_CALCULATOR_STATE_LABEL = 'Your state';

/** Call-to-action anchor label routing learners toward official portals. */
const DEADLINE_CALCULATOR_OFFICIAL_LINK_LABEL = 'Register on your state site';

/**
 * Props for {@link DeadlineCalculator}.
 */
export interface DeadlineCalculatorProps {
  /** Ensures Agentic registry mounts remain prop-symmetric with orchestrator flows. */
  readonly civicSimulatorMounted?: true;
}

/**
 * Chooses contextual chroming classes based on urgency heuristics emitted by {@link calculateDeadline}.
 *
 * @param urgency - Traffic-light style urgency classification from simulation math.
 * @returns Tailwind-ready utility class string describing contextual backgrounds.
 */
function deadlineUrgencySurfaceClass(urgency: DeadlineResult['urgency']): string {
  if (urgency === 'green') {
    return 'bg-[var(--civic-green-light)]';
  }
  if (urgency === 'amber') {
    return 'bg-[var(--civic-amber-light)]';
  }
  return 'bg-[var(--civic-red-light)]';
}

/**
 * Props for {@link DeadlineCalculatorSummary}.
 */
interface DeadlineCalculatorSummaryProps {
  /** Structured deadline analytics emitted by {@link calculateDeadline}. */
  result: DeadlineResult;
}

/**
 * Highlights official deadlines plus remaining-day counts for anxious learners.
 *
 * @param props - Simulation analytics describing urgency bands.
 * @returns Styled summary panel reinforcing time-sensitive civic tasks.
 */
function DeadlineCalculatorSummary({ result }: DeadlineCalculatorSummaryProps): ReactNode {
  const surfaceClass = deadlineUrgencySurfaceClass(result.urgency);

  return (
    <div className={`mt-5 rounded-[18px] p-5 ${surfaceClass}`}>
      <p className="font-bold text-[var(--ink)]">{result.deadlineLabel}</p>
      <p className="mt-1 text-[var(--ink-secondary)]">{result.daysRemaining} days left</p>
    </div>
  );
}

/**
 * Lightweight registration deadline explorer backed by deterministic civic simulation math.
 *
 * Demonstrates how Oracle-guided journeys can contextualize urgent civic timelines without
 * live secretary-of-state integrations during hackathon demos.
 *
 * @param _props - Reserved prop extension surface for registry symmetry.
 * @returns Interactive state selector plus urgency-highlighted deadline summary.
 */
export default function DeadlineCalculator(_props: DeadlineCalculatorProps): ReactNode {
  const [selectedStateLabel, setSelectedStateLabel] = useState<string>(
    DEADLINE_CALCULATOR_DEFAULT_STATE_LABEL,
  );

  const deadlineSnapshot = useMemo((): DeadlineResult => {
    const isoTimestamp =
      DEMO_STATE_DEADLINE_ISO_BY_LABEL[selectedStateLabel] ?? DEADLINE_CALCULATOR_FALLBACK_ISO;
    return calculateDeadline(selectedStateLabel, isoTimestamp);
  }, [selectedStateLabel]);

  const handleStateChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    setSelectedStateLabel(event.target.value);
  };

  return (
    <section className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_8px_24px_var(--shadow)]">
      <h2 className="text-[1.6rem] font-bold text-[var(--ink)]">{DEADLINE_CALCULATOR_SECTION_TITLE}</h2>
      <label className="mt-4 block">
        <span className="mb-2 block text-sm font-semibold text-[var(--ink)]">
          {DEADLINE_CALCULATOR_STATE_LABEL}
        </span>
        <select
          className="min-h-12 w-full rounded-[16px] border border-[var(--border)] px-4"
          value={selectedStateLabel}
          onChange={handleStateChange}
        >
          {Object.keys(DEMO_STATE_DEADLINE_ISO_BY_LABEL).map((name: string): ReactNode => (
            <option key={name}>{name}</option>
          ))}
        </select>
      </label>
      <DeadlineCalculatorSummary result={deadlineSnapshot} />
      <a
        className="mt-4 inline-flex min-h-12 items-center rounded-full bg-[var(--civic-green)] px-5 text-sm font-semibold text-white"
        href={deadlineSnapshot.officialUrl}
        rel="noreferrer"
        target="_blank"
      >
        {DEADLINE_CALCULATOR_OFFICIAL_LINK_LABEL}
      </a>
    </section>
  );
}
