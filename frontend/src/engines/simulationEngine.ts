/*
 * PROBLEM 2 - India Data Consistency: simulationEngine.ts
 *
 * All US electoral data replaced with Indian equivalents:
 * - US states -> Indian states
 * - US SoS URLs -> official ECI/state election commission URLs
 * - Ballot stages -> actual ECI EVM+VVPAT procedure
 * - ID evaluation -> ECI 12-document standard
 * - Deadline calculator -> Form 6/7/8 + ECI cutoff dates
 * - Vote counter -> polling booths, not US precincts
 */

import type {
  DeadlineResult,
  IdAnswers,
  IdCheckResult,
  VoteCountFrame,
  VoteCountParams,
} from '../types';

// Indian state registration deadlines (Form 6 cutoff: 30 days before qualifying date)
// Reference: voters.eci.gov.in
const officialUrls: Record<string, string> = {
  'Maharashtra': 'https://ceomaharashtra.nic.in',
  'Tamil Nadu': 'https://www.elections.tn.gov.in',
  'Uttar Pradesh': 'https://ceouttarpradesh.nic.in',
  'West Bengal': 'https://ceowestbengal.nic.in',
  'Karnataka': 'https://ceokarnataka.kar.nic.in',
  'Rajasthan': 'https://ceorajasthan.nic.in',
  'Gujarat': 'https://ceogujarat.nic.in',
  'Madhya Pradesh': 'https://www.ceomadhyapradesh.nic.in',
};

export const buildVoteCountFrames = ({
  regionSize,
  candidateCount,
  precinctCount,
}: VoteCountParams): VoteCountFrame[] => {
  const totalVotes = Math.max(precinctCount * 100, regionSize);
  const perBooth = Math.floor(totalVotes / precinctCount);
  const totals = Array.from({ length: candidateCount }, () => 0);

  return Array.from({ length: precinctCount }, (_, index) => {
    const baseVotes = perBooth + (index % 3) * 11;
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
      precinct: `Booth ${index + 1}`,
      reportedVotes: baseVotes,
      outstandingVotes: Math.max(0, perBooth + 20 - baseVotes),
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
    deadlineLabel: deadline.toLocaleDateString('en-IN', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }),
    daysRemaining,
    urgency,
    officialUrl: officialUrls[state] ?? 'https://voters.eci.gov.in',
  };
};

export const evaluateIdAnswers = (answers: IdAnswers): IdCheckResult => {
  // ECI accepts 12 documents — EPIC is primary, others are valid alternatives
  if (answers.hasPhotoId && answers.nameMatches && answers.stateIssued) {
    return {
      status: answers.hasAddressProof ? 'valid' : 'partial',
      message: answers.hasAddressProof
        ? 'You are ready to vote. Your EPIC or approved document is sufficient.'
        : 'You are close. Any one of the 12 ECI-approved documents will work.',
      nextSteps: answers.hasAddressProof
        ? [
            'Bring your EPIC card or one of the 12 approved ECI documents.',
            'Check your polling booth number on your voter slip (parchhi).',
          ]
        : [
            'Accepted alternatives: Aadhaar, Passport, PAN card, MNREGA card, Driving Licence.',
            'Your Booth Level Officer (BLO) can assist if you have any issue.',
          ],
    };
  }

  return {
    status: 'needs-action',
    message: 'You may still be able to vote — ask the Presiding Officer at your polling booth.',
    nextSteps: [
      'Contact your Booth Level Officer (BLO) before polling day.',
      'Submit Form 6 at voters.eci.gov.in to register or correct your details.',
      'Any of the 12 ECI-approved documents are accepted in place of EPIC.',
    ],
  };
};

// ECI EVM + VVPAT voting procedure (India has used EVMs exclusively since 2001)
export const buildBallotStages = () => [
  {
    id: 'arrive',
    label: 'Arrive at your polling booth',
    help: 'Find your booth number on your voter slip (parchhi). Bring your EPIC card or any ECI-approved document.',
  },
  {
    id: 'verification',
    label: 'Identity verification by Presiding Officer',
    help: 'The officer checks your name in the electoral roll and marks it. Indelible ink is applied to your left index finger.',
  },
  {
    id: 'evm-vote',
    label: 'Press the EVM button for your candidate',
    help: 'Inside the voting compartment, press the blue button next to your candidate\'s name and party symbol. A long beep confirms your vote.',
  },
  {
    id: 'vvpat',
    label: 'Verify your vote on VVPAT',
    help: 'A paper slip with your candidate\'s symbol appears in the VVPAT window for 7 seconds. This is your proof of correct recording.',
  },
];
