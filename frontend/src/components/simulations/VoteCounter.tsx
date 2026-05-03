import { useMemo, useState } from 'react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { trackSimulationInteracted } from '../../engines/confusionTracker';
import { buildVoteCountFrames, calculateRecountTrigger } from '../../engines/simulationEngine';

const VoteCounter = () => {
  const [regionSize, setRegionSize] = useState(12000);
  const [candidateCount, setCandidateCount] = useState(2);
  const [precinctCount, setPrecinctCount] = useState(6);
  const [threshold, setThreshold] = useState(0.5);

  const frames = useMemo(
    () =>
      buildVoteCountFrames({
        regionSize,
        candidateCount,
        precinctCount,
        recountThresholdPercent: threshold,
      }),
    [candidateCount, precinctCount, regionSize, threshold],
  );
  const latest = frames.at(-1) ?? { totals: [] };
  const recount = calculateRecountTrigger(latest.totals, threshold);

  return (
    <section className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_8px_24px_var(--shadow)]">
      <h2 className="text-[1.6rem] font-bold text-[var(--ink)]">Watch votes come in</h2>
      <p className="mt-2 max-w-prose text-[var(--ink-secondary)]">
        Move the sliders to see how totals change across polling booths.
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {[
          ['Constituency size', regionSize, setRegionSize, 4000, 50000, 1000],
          ['Candidates', candidateCount, setCandidateCount, 2, 4, 1],
          ['Polling Booths', precinctCount, setPrecinctCount, 3, 12, 1],
          ['Recount %', threshold, setThreshold, 0.25, 2, 0.25],
        ].map(([label, value, setter, min, max, step]) => (
          <label key={label as string} className="block">
            <span className="mb-2 block text-sm font-semibold text-[var(--ink)]">
              {label as string}: {value as number}
            </span>
            <input
              type="range"
              min={min as number}
              max={max as number}
              step={step as number}
              value={value as number}
              onChange={(event) => {
                void trackSimulationInteracted('vote-counter', String(event.target.value));
                (setter as (value: number) => void)(Number(event.target.value));
              }}
              className="w-full accent-[var(--civic-green)]"
            />
          </label>
        ))}
      </div>
      <div className="mt-6 h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={frames.map((frame) => ({
              precinct: frame.precinct,
              lead: frame.totals[0] ?? 0,
              second: frame.totals[1] ?? 0,
            }))}
          >
            <XAxis dataKey="precinct" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="lead" fill="#2D7D5A" radius={[8, 8, 0, 0]} />
            <Bar dataKey="second" fill="#4A6FA5" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 rounded-[18px] bg-[var(--surface-2)] p-4 text-[var(--ink)]">
        {recount.triggered
          ? `A recount review would trigger here. The margin is ${recount.marginPercent}%.`
          : `No recount threshold met. The margin is ${recount.marginPercent}%.`}
      </div>
    </section>
  );
};

export default VoteCounter;
