import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { useElectraStore } from '../../engines/stateEngine';
import { civicBus } from '../../events/civicEventBus';
import { civicEvents } from '../../firebase/analytics';
import { persistSimulationState } from '../../firebase/firestore';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import type {
  AuditResult,
  BallotEvent,
  BallotSelection,
  CertificationEvent,
  OracleRequest,
  TallyResult,
} from '../../types';
import { StreamingOraclePanel } from '../streaming/StreamingOraclePanel';

interface ElectionSimulatorProps {
  onClose: () => void;
}

const stages = [
  'Ballot Design & Ingestion',
  'Tallying Engine',
  'Canvass & Certification',
  'Post-Election Audit',
];

const fallbackBallot = (): BallotEvent => ({
  serial: `EL-${Math.floor(Math.random() * 900000 + 100000)}`,
  precinct: 'PCT-014',
  timestamp: new Date().toISOString(),
  encryptedPayload: Array.from({ length: 96 }, () => Math.round(Math.random()).toString()).join(''),
  signature: crypto.randomUUID(),
});

const fallbackTally = (anomalyInjected: boolean): TallyResult => ({
  totalVotes: anomalyInjected ? 13842 : 12710,
  precinctsReporting: anomalyInjected ? 83 : 71,
  confidenceInterval: anomalyInjected ? 4.8 : 1.2,
  anomalyInjected,
  totals: [
    { candidate: 'Rivera', votes: anomalyInjected ? 6100 : 5840 },
    { candidate: 'Chen', votes: anomalyInjected ? 6722 : 6018 },
    { candidate: 'Patel', votes: anomalyInjected ? 1020 : 852 },
  ],
  affectedPrecinct: anomalyInjected ? 'PCT-044' : undefined,
});

const fallbackCertification = (): CertificationEvent => ({
  certifiedAt: new Date().toISOString(),
  certificateId: `CERT-${Math.floor(Math.random() * 90000 + 10000)}`,
  provenanceChain: [
    'Precinct event frame signed',
    'County canvass board reviewed',
    'State certification ledger appended',
  ],
  summary: 'Mock certification complete with provenance chain attached.',
});

const fallbackAudit = (): AuditResult => ({
  ballotsSampled: 312,
  machineCount: 187,
  handCount: 187,
  discrepancy: 0,
  recommendation: 'No material discrepancy found. Preserve chain of custody records.',
});

async function postJson<T>(url: string, body: unknown, fallback: () => T): Promise<T> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Request failed with ${response.status}`);
    }

    return (await response.json()) as T;
  } catch {
    return fallback();
  }
}

export const ElectionSimulator = ({ onClose }: ElectionSimulatorProps) => {
  const enabled = useFeatureFlag('election_simulator_enabled');
  const anomalyEnabled = useFeatureFlag('simulator_anomaly_injection');
  const { currentState, history, cognitiveLevel, language, journeyId } = useElectraStore();
  const [stage, setStage] = useState(0);
  const [ballot, setBallot] = useState<BallotSelection>({
    president: 'Rivera',
    senator: 'Okafor',
    measureA: 'yes',
  });
  const [ballotEvent, setBallotEvent] = useState<BallotEvent | null>(null);
  const [tally, setTally] = useState<TallyResult | null>(null);
  const [certification, setCertification] = useState<CertificationEvent | null>(null);
  const [audit, setAudit] = useState<AuditResult | null>(null);
  const [timeline, setTimeline] = useState(100);
  const [anomalyInjected, setAnomalyInjected] = useState(false);

  const narrationRequest: OracleRequest = useMemo(
    () => ({
      userMessage: `You are ELECTRA's civic narrator. Explain ${stages[stage]} to a ${cognitiveLevel} voter. Include: what officials do, what safeguards exist, what citizens can verify. Respond in 2-3 sentences.`,
      currentState,
      history,
      cognitiveLevel,
      language,
      sessionId: journeyId,
    }),
    [cognitiveLevel, currentState, history, journeyId, language, stage],
  );

  if (!enabled) {
    return null;
  }

  const chartData = (tally?.totals ?? fallbackTally(false).totals).map((entry) => ({
    candidate: entry.candidate,
    votes: Math.round(entry.votes * (timeline / 100)),
  }));

  const recordStageCompletion = (stepId: string) => {
    civicBus.emit({ type: 'STEP_COMPLETED', payload: { stepId, duration: 1 } });
  };

  const handleSubmitBallot = async () => {
    const event = await postJson<BallotEvent>(
      '/api/simulator/ingest',
      { selection: ballot, precinct: 'PCT-014' },
      fallbackBallot,
    );
    setBallotEvent(event);
    setStage(1);
    recordStageCompletion('simulator_ingest');
  };

  const handleRunTally = async (withAnomaly: boolean) => {
    const result = await postJson<TallyResult>(
      '/api/simulator/tally',
      { anomaly: withAnomaly, precincts: 88 },
      () => fallbackTally(withAnomaly),
    );
    setAnomalyInjected(withAnomaly);
    setTally(result);
    recordStageCompletion('simulator_tally');
  };

  const handleCertify = async () => {
    const result = await postJson<CertificationEvent>(
      '/api/simulator/certify',
      tally ?? fallbackTally(anomalyInjected),
      fallbackCertification,
    );
    setCertification(result);
    setStage(3);
    recordStageCompletion('simulator_certify');
  };

  const handleAudit = async () => {
    const result = await postJson<AuditResult>(
      '/api/simulator/audit',
      { sampleSize: 312, tally: tally ?? fallbackTally(anomalyInjected) },
      fallbackAudit,
    );
    setAudit(result);
    civicEvents.simulatorCompleted(anomalyInjected);
    civicBus.emit({
      type: 'SCORE_EARNED',
      payload: { points: 100, reason: 'Run election simulator' },
    });
    await persistSimulationState(journeyId, {
      ballotEvent,
      tally,
      certification,
      audit: result,
      completedAt: new Date().toISOString(),
    });
    recordStageCompletion('simulator_audit');
  };

  return (
    <motion.section
      role="dialog"
      aria-modal="true"
      aria-label="Election integrity simulator"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 overflow-auto bg-[#06111f] text-white"
    >
      <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#06111f]/95 px-5 py-4 backdrop-blur">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.08em] text-sky-300">
            Election Integrity Simulator
          </p>
          <h2 className="text-2xl font-bold">{stages[stage]}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {stages.map((label, index) => (
            <button
              key={label}
              type="button"
              onClick={() => setStage(index)}
              className={`min-h-10 rounded-lg px-3 text-sm font-semibold ${
                index === stage ? 'bg-white text-[#06111f]' : 'bg-white/10 text-white'
              }`}
            >
              {index + 1}
            </button>
          ))}
          <button
            type="button"
            onClick={onClose}
            className="min-h-10 rounded-lg border border-white/20 px-3 text-sm font-semibold"
          >
            Close
          </button>
        </div>
      </div>

      <div className="grid min-h-[calc(100vh-84px)] gap-6 px-5 py-6 xl:grid-cols-[1fr_420px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={stage}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="min-h-[680px]"
          >
            {stage === 0 ? (
              <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
                <form className="rounded-lg border border-white/10 bg-white/10 p-5">
                  <h3 className="text-xl font-bold">Mock ballot</h3>
                  <label className="mt-4 block text-sm">
                    President
                    <select
                      value={ballot.president}
                      onChange={(event) => setBallot({ ...ballot, president: event.target.value })}
                      className="mt-2 min-h-12 w-full rounded-lg bg-white px-3 text-[#06111f]"
                    >
                      <option>Rivera</option>
                      <option>Chen</option>
                      <option>Patel</option>
                    </select>
                  </label>
                  <label className="mt-4 block text-sm">
                    Senator
                    <select
                      value={ballot.senator}
                      onChange={(event) => setBallot({ ...ballot, senator: event.target.value })}
                      className="mt-2 min-h-12 w-full rounded-lg bg-white px-3 text-[#06111f]"
                    >
                      <option>Okafor</option>
                      <option>Nguyen</option>
                      <option>Garcia</option>
                    </select>
                  </label>
                  <fieldset className="mt-4">
                    <legend className="text-sm">Local Measure A</legend>
                    <div className="mt-2 flex gap-2">
                      {(['yes', 'no'] as const).map((choice) => (
                        <button
                          key={choice}
                          type="button"
                          onClick={() => setBallot({ ...ballot, measureA: choice })}
                          aria-pressed={ballot.measureA === choice}
                          className={`min-h-12 flex-1 rounded-lg px-3 font-bold ${
                            ballot.measureA === choice
                              ? 'bg-sky-300 text-[#06111f]'
                              : 'bg-white/10 text-white'
                          }`}
                        >
                          {choice.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <button
                    type="button"
                    onClick={() => void handleSubmitBallot()}
                    className="mt-6 min-h-12 w-full rounded-lg bg-emerald-300 font-bold text-[#06111f]"
                  >
                    Submit Ballot
                  </button>
                </form>

                <div className="rounded-lg border border-white/10 bg-black/20 p-5">
                  <h3 className="text-xl font-bold">Encrypted event frame</h3>
                  {ballotEvent ? (
                    <div className="mt-4 space-y-3 text-sm">
                      <p>Serial: {ballotEvent.serial}</p>
                      <p>Precinct: {ballotEvent.precinct}</p>
                      <p>Timestamp: {ballotEvent.timestamp}</p>
                      <p className="break-all font-mono text-emerald-200">
                        {ballotEvent.encryptedPayload}
                      </p>
                    </div>
                  ) : (
                    <motion.p
                      animate={{ opacity: [0.35, 1, 0.35] }}
                      transition={{ repeat: Infinity, duration: 1.4 }}
                      className="mt-4 break-all font-mono text-emerald-200"
                    >
                      01001011 10100100 01101010 00011101 11001001 01110100
                    </motion.p>
                  )}
                </div>
              </div>
            ) : null}

            {stage === 1 ? (
              <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
                <div className="rounded-lg border border-white/10 bg-white/10 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-xl font-bold">Live tally</h3>
                    <button
                      type="button"
                      onClick={() => void handleRunTally(false)}
                      className="min-h-10 rounded-lg bg-white px-3 text-sm font-bold text-[#06111f]"
                    >
                      Run count
                    </button>
                  </div>
                  <div className="mt-5 h-[360px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid stroke="rgba(255,255,255,0.12)" />
                        <XAxis dataKey="candidate" stroke="#dbeafe" />
                        <YAxis stroke="#dbeafe" />
                        <Tooltip />
                        <Bar dataKey="votes" fill="#7dd3fc" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <label className="mt-4 block text-sm">
                    Timeline scrubber
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={timeline}
                      onChange={(event) => setTimeline(Number(event.target.value))}
                      className="mt-2 w-full"
                    />
                  </label>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/20 p-5">
                  <p className="text-sm text-slate-300">Total votes</p>
                  <p className="text-3xl font-bold">{tally?.totalVotes ?? 0}</p>
                  <p className="mt-4 text-sm text-slate-300">Precincts reporting</p>
                  <p className="text-2xl font-bold">{tally?.precinctsReporting ?? 0}</p>
                  <p className="mt-4 text-sm text-slate-300">Confidence interval</p>
                  <p className="text-2xl font-bold">+/-{tally?.confidenceInterval ?? 0}%</p>
                  {anomalyEnabled ? (
                    <button
                      type="button"
                      onClick={() => void handleRunTally(true)}
                      className="mt-5 min-h-12 w-full rounded-lg bg-amber-300 font-bold text-[#06111f]"
                    >
                      Inject Anomaly
                    </button>
                  ) : null}
                  {tally?.anomalyInjected ? (
                    <p className="mt-4 rounded-lg bg-amber-300/20 p-3 text-sm text-amber-100">
                      Confidence interval warning in {tally.affectedPrecinct}.
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setStage(2)}
                    className="mt-4 min-h-12 w-full rounded-lg bg-white px-3 font-bold text-[#06111f]"
                  >
                    Continue to canvass
                  </button>
                </div>
              </div>
            ) : null}

            {stage === 2 ? (
              <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
                <div className="rounded-lg border border-white/10 bg-white/10 p-5">
                  <h3 className="text-xl font-bold">Canvass checklist</h3>
                  {[
                    'Signature verification',
                    'Provisional ballot review',
                    'Precinct reconciliation',
                    'Public board meeting',
                  ].map((item) => (
                    <details
                      key={item}
                      className="mt-3 rounded-lg border border-white/10 bg-black/20 p-4"
                    >
                      <summary className="cursor-pointer font-semibold">{item}</summary>
                      <p className="mt-3 text-sm text-slate-200">
                        Audit Trail: clerk initials, timestamp, ledger hash, observer note.
                      </p>
                    </details>
                  ))}
                  <button
                    type="button"
                    onClick={() => void handleCertify()}
                    className="mt-6 min-h-12 rounded-lg bg-emerald-300 px-4 font-bold text-[#06111f]"
                  >
                    Certify Election
                  </button>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/20 p-5">
                  <h3 className="text-xl font-bold">Certificate</h3>
                  {certification ? (
                    <div className="mt-4 space-y-3 text-sm">
                      <p>{certification.certificateId}</p>
                      <p>{certification.summary}</p>
                      {certification.provenanceChain.map((item) => (
                        <p key={item} className="rounded bg-white/10 p-2">
                          {item}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-4 text-slate-300">Certification report appears here.</p>
                  )}
                </div>
              </div>
            ) : null}

            {stage === 3 ? (
              <div className="grid gap-5 lg:grid-cols-2">
                <div className="rounded-lg border border-white/10 bg-white/10 p-5">
                  <h3 className="text-xl font-bold">Random audit selection</h3>
                  <p className="mt-2 text-slate-200">
                    Random seed selects ballots for a hand recount sample.
                  </p>
                  <button
                    type="button"
                    onClick={() => void handleAudit()}
                    className="mt-5 min-h-12 rounded-lg bg-white px-4 font-bold text-[#06111f]"
                  >
                    Run Audit
                  </button>
                  {audit ? (
                    <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-lg bg-black/20 p-3">
                        Machine: {audit.machineCount}
                      </div>
                      <div className="rounded-lg bg-black/20 p-3">Hand: {audit.handCount}</div>
                      <div className="rounded-lg bg-black/20 p-3">
                        Sampled: {audit.ballotsSampled}
                      </div>
                      <div className="rounded-lg bg-black/20 p-3">
                        Discrepancy: {audit.discrepancy}
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="rounded-lg border border-white/10 bg-white p-6 text-[#06111f]">
                  <h3 className="text-xl font-bold">Audit Report</h3>
                  <p className="mt-3 text-sm">
                    {audit?.recommendation ?? 'Run the audit to generate the PDF-style summary.'}
                  </p>
                  <button
                    type="button"
                    disabled={!audit}
                    className="mt-5 min-h-12 rounded-lg bg-[#06111f] px-4 font-bold text-white disabled:opacity-40"
                  >
                    Download Summary
                  </button>
                </div>
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>

        <aside className="space-y-4">
          <StreamingOraclePanel key={stage} request={narrationRequest} sessionId={journeyId} />
        </aside>
      </div>
    </motion.section>
  );
};
