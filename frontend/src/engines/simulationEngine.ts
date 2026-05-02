import type {
  DeadlineResult,
  IdAnswers,
  IdCheckResult,
  VoteCountFrame,
  VoteCountParams,
} from '../types';

const officialUrls: Record<string, string> = {
  Arizona: 'https://azsos.gov/elections',
  Georgia: 'https://mvp.sos.ga.gov',
  Wisconsin: 'https://myvote.wi.gov',
  'New York': 'https://elections.ny.gov',
};

export const buildVoteCountFrames = ({
  regionSize,
  candidateCount,
  precinctCount,
}: VoteCountParams): VoteCountFrame[] => {
  const totalVotes = Math.max(precinctCount * 100, regionSize);
  const perPrecinct = Math.floor(totalVotes / precinctCount);
  const totals = Array.from({ length: candidateCount }, () => 0);

  return Array.from({ length: precinctCount }, (_, index) => {
    const baseVotes = perPrecinct + (index % 3) * 11;
    const splits = Array.from(
      { length: candidateCount },
      (_, candidateIndex) =>
        Math.floor(baseVotes / candidateCount) +
        (candidateIndex === index % candidateCount ? 8 : 0),
    );
    const splitTotal = splits.reduce((sum, value) => sum + value, 0);
    const adjusted = [...splits];
    adjusted[0] = (adjusted[0] ?? 0) + baseVotes - splitTotal;
    for (const [candidateIndex, value] of adjusted.entries()) {
      totals[candidateIndex] = (totals[candidateIndex] ?? 0) + value;
    }

    return {
      precinct: `Precinct ${index + 1}`,
      reportedVotes: baseVotes,
      outstandingVotes: Math.max(0, perPrecinct + 20 - baseVotes),
      totals: [...totals],
    };
  });
};

export const calculateRecountTrigger = (totals: number[], thresholdPercent: number) => {
  const sorted = [...totals].sort((a, b) => b - a);
  const totalVotes = totals.reduce((sum, value) => sum + value, 0);
  const marginVotes = Math.abs((sorted[0] ?? 0) - (sorted[1] ?? 0));
  const marginPercent =
    totalVotes === 0 ? 0 : Number(((marginVotes / totalVotes) * 100).toFixed(2));
  return {
    totalVotes,
    marginVotes,
    marginPercent,
    thresholdPercent,
    triggered: marginPercent <= thresholdPercent,
  };
};

export const calculateDeadline = (
  state: string,
  deadlineIso: string,
  now = new Date(),
): DeadlineResult => {
  const deadline = new Date(deadlineIso);
  const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const urgency = daysRemaining > 7 ? 'green' : daysRemaining > 1 ? 'amber' : 'red';
  return {
    state,
    deadlineLabel: deadline.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }),
    daysRemaining,
    urgency,
    officialUrl: officialUrls[state] ?? 'https://vote.gov',
  };
};

export const evaluateIdAnswers = (answers: IdAnswers): IdCheckResult => {
  if (answers.hasPhotoId && answers.nameMatches && answers.stateIssued) {
    return {
      status: answers.hasAddressProof ? 'valid' : 'partial',
      message: answers.hasAddressProof
        ? 'You likely have what you need.'
        : 'You are close. Bring one paper with your address too.',
      nextSteps: answers.hasAddressProof
        ? ['Bring your photo ID.', 'Check poll hours before you leave.']
        : ['Bring one paper with your address.', 'Keep your photo ID with you.'],
    };
  }

  return {
    status: 'needs-action',
    message: 'You may need a backup vote option today.',
    nextSteps: [
      'Ask for a backup vote option at the polling place.',
      'If you can, bring a state photo ID before polls close.',
      'Do not leave without asking what you can still do.',
    ],
  };
};

export const buildBallotStages = () => [
  {
    id: 'signature',
    label: 'Sign your envelope',
    help: 'Your signature helps confirm it is your ballot.',
  },
  {
    id: 'envelope',
    label: 'Seal the envelope',
    help: 'The ballot must stay protected on the way in.',
  },
  {
    id: 'scan',
    label: 'Ballot is scanned',
    help: 'The scanner reads the marks on the ballot.',
  },
  {
    id: 'count',
    label: 'Ballot is counted',
    help: 'Your ballot joins the final total after checks are done.',
  },
];
