import type {
  DeadlineResult,
  IdAnswers,
  IdCheckResult,
  VoteCountFrame,
  VoteCountParams,
} from '../types';

/** Milliseconds inside one standard UTC day used when estimating civic deadlines. */
const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** Minimum whole-day buffer treating deadlines as comfortable when beyond this threshold. */
const DEADLINE_GREEN_ZONE_MIN_DAYS = 7;

/** Minimum whole-day buffer still treated as cautionary amber zone. */
const DEADLINE_AMBER_ZONE_MIN_DAYS = 1;

/** Fallback portal when demo datasets omit explicit secretary-of-state URLs. */
const DEFAULT_STATE_PORTAL_URL = 'https://vote.gov';

/** Multiplier approximating aggregate ballots derived from precinct counts for demos. */
const VOTE_COUNT_MIN_VOTES_PER_SIMULATION = 100;

/** Modular bias shaping pseudo-random vote splits across precincts. */
const VOTE_COUNT_SPLIT_MODULUS_WEIGHT = 11;

/** Vote surplus allocated to whichever candidate index aligns with rotating precinct index. */
const VOTE_COUNT_TARGETED_SURPLUS = 8;

/** Synthetic outstanding ballot cushion inserted for storytelling dashboards. */
const VOTE_COUNT_OUTSTANDING_VOTE_BUFFER = 20;

/** Demo deep-links encouraging learners to validate deadlines against official portals. */
const STATE_OFFICIAL_PORTAL_URLS: Record<string, string> = {
  Arizona: 'https://azsos.gov/elections',
  Georgia: 'https://mvp.sos.ga.gov',
  Wisconsin: 'https://myvote.wi.gov',
  'New York': 'https://elections.ny.gov',
};

/** Structured recount diagnostics emitted by {@link calculateRecountTrigger}. */
export interface RecountTriggerDiagnostics {
  aggregateVotes: number;
  marginVotes: number;
  marginPercent: number;
  thresholdPercent: number;
  triggered: boolean;
}

/**
 * Builds synthetic precinct-level tally frames for Vote Counter civic simulations.
 *
 * @param params - Regional sizing knobs describing synthetic civic datasets.
 * @returns Vote frames aggregating per-precinct totals for visualization layers.
 */
export const buildVoteCountFrames = ({
  regionSize,
  candidateCount,
  precinctCount,
  recountThresholdPercent: _recountThresholdPercent,
}: VoteCountParams): VoteCountFrame[] => {
  const totalVotes = Math.max(precinctCount * VOTE_COUNT_MIN_VOTES_PER_SIMULATION, regionSize);
  const perPrecinct = Math.floor(totalVotes / precinctCount);
  const totals = Array.from({ length: candidateCount }, (): number => 0);

  return Array.from({ length: precinctCount }, (_, index: number): VoteCountFrame => {
    const baseVotes = perPrecinct + (index % 3) * VOTE_COUNT_SPLIT_MODULUS_WEIGHT;
    const splits = Array.from({ length: candidateCount }, (_, candidateIndex: number): number =>
      Math.floor(baseVotes / candidateCount) +
      (candidateIndex === index % candidateCount ? VOTE_COUNT_TARGETED_SURPLUS : 0),
    );
    const splitTotal = splits.reduce((sum: number, value: number): number => sum + value, 0);
    const adjusted = [...splits];
    adjusted[0] = (adjusted[0] ?? 0) + baseVotes - splitTotal;
    for (const [candidateIndex, value] of adjusted.entries()) {
      totals[candidateIndex] = (totals[candidateIndex] ?? 0) + value;
    }

    return {
      outstandingVotes: Math.max(0, perPrecinct + VOTE_COUNT_OUTSTANDING_VOTE_BUFFER - baseVotes),
      precinct: `Precinct ${String(index + 1)}`,
      reportedVotes: baseVotes,
      totals: [...totals],
    };
  });
};

/**
 * Computes whether synthetic margins fall inside recount thresholds for storytelling modules.
 *
 * @param totals - Candidate-level totals aggregated across precinct simulations.
 * @param thresholdPercent - Configurable recount trigger percentage supplied by UX sliders.
 * @returns Diagnostic bundle describing margin distances versus statutory thresholds.
 */
export const calculateRecountTrigger = (
  totals: number[],
  thresholdPercent: number,
): RecountTriggerDiagnostics => {
  const sorted = [...totals].sort((a: number, b: number): number => b - a);
  const aggregateVotes = totals.reduce((sum: number, value: number): number => sum + value, 0);
  const marginVotes = Math.abs((sorted[0] ?? 0) - (sorted[1] ?? 0));
  const marginPercent =
    aggregateVotes === 0 ? 0 : Number(((marginVotes / aggregateVotes) * 100).toFixed(2));

  return {
    aggregateVotes,
    marginPercent,
    marginVotes,
    thresholdPercent,
    triggered: marginPercent <= thresholdPercent,
  };
};

/**
 * Projects pseudo-real deadline summaries using synthetic ISO timestamps for civic demos.
 *
 * @param state - Human-readable jurisdiction label mirrored in Electra UX copy.
 * @param deadlineIso - ISO-8601 snapshot describing registration deadlines for demos.
 * @param now - Injectable clock enabling deterministic tests around urgency rails.
 * @returns Structured deadline analytics powering countdown visuals + outbound CTAs.
 */
export const calculateDeadline = (
  state: string,
  deadlineIso: string,
  now: Date = new Date(),
): DeadlineResult => {
  const deadline = new Date(deadlineIso);
  const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / MS_PER_DAY);
  const urgency =
    daysRemaining > DEADLINE_GREEN_ZONE_MIN_DAYS
      ? 'green'
      : daysRemaining > DEADLINE_AMBER_ZONE_MIN_DAYS
        ? 'amber'
        : 'red';

  return {
    daysRemaining,
    deadlineLabel: deadline.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    officialUrl: STATE_OFFICIAL_PORTAL_URLS[state] ?? DEFAULT_STATE_PORTAL_URL,
    state,
    urgency,
  };
};

/**
 * Evaluates synthetic identification questionnaires describing polling-place preparedness.
 *
 * @param answers - Boolean checklist describing learners' identification posture.
 * @returns Guidance bundle summarizing remaining administrative risks.
 */
export const evaluateIdAnswers = (answers: IdAnswers): IdCheckResult => {
  if (answers.hasPhotoId && answers.nameMatches && answers.stateIssued) {
    return {
      message: answers.hasAddressProof
        ? 'You likely have what you need.'
        : 'You are close. Bring one paper with your address too.',
      nextSteps: answers.hasAddressProof
        ? ['Bring your photo ID.', 'Check poll hours before you leave.']
        : ['Bring one paper with your address.', 'Keep your photo ID with you.'],
      status: answers.hasAddressProof ? 'valid' : 'partial',
    };
  }

  return {
    message: 'You may need a backup vote option today.',
    nextSteps: [
      'Ask for a backup vote option at the polling place.',
      'If you can, bring a state photo ID before polls close.',
      'Do not leave without asking what you can still do.',
    ],
    status: 'needs-action',
  };
};

/** Structured pedagogical stage emitted by {@link buildBallotStages}. */
export interface BallotSimulationStage {
  /** Stable identifier correlating analytics with Agentic render targets. */
  id: string;
  /** Learner-facing headline describing the mail-ballot milestone. */
  label: string;
  /** Supplementary reassurance copy calming anxious first-time voters. */
  help: string;
}

/**
 * Canonical mail-ballot lifecycle explanations powering Agentic civic simulations.
 *
 * @returns Ordered stages describing secured ballot handling expectations.
 */
export const buildBallotStages = (): BallotSimulationStage[] => [
  {
    help: 'Your signature helps confirm it is your ballot.',
    id: 'signature',
    label: 'Sign your envelope',
  },
  {
    help: 'The ballot must stay protected on the way in.',
    id: 'envelope',
    label: 'Seal the envelope',
  },
  {
    help: 'The scanner reads the marks on the ballot.',
    id: 'scan',
    label: 'Ballot is scanned',
  },
  {
    help: 'Your ballot joins the final total after checks are done.',
    id: 'count',
    label: 'Ballot is counted',
  },
];
